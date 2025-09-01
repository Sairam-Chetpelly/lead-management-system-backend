const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const Lead = require('../models/Lead');
const LeadActivity = require('../models/LeadActivity');
const User = require('../models/User');
const Role = require('../models/Role');
const Status = require('../models/Status');
const Centre = require('../models/Centre');
const Language = require('../models/Language');
const LeadSource = require('../models/LeadSource');
const ProjectAndHouseType = require('../models/ProjectAndHouseType');
const CallLog = require('../models/CallLog');
const ActivityLog = require('../models/ActivityLog');
const GoogleAdsHistory = require('../models/GoogleAdsHistory');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Configure multer for CSV uploads
const csvUpload = multer({ dest: 'uploads/csv/' });

// Configure multer for activity documents
const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/documents');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'doc-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const documentUpload = multer({
  storage: documentStorage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Round robin assignment tracking
let presalesRoundRobin = 0;
let cpPresalesRoundRobin = 0;
let salesRoundRobin = {};
let languageRoundRobin = {};

// Helper function to get next presales agent
async function getNextPresalesAgent(assignToCpPresales = false) {
  const presalesRole = await Role.findOne({ slug: 'presales_agent' });
  const activeStatus = await Status.findOne({ slug: 'active' });
  if (!presalesRole) return null;
  if (!activeStatus) return null;

  let presalesAgents;
  
  if (assignToCpPresales) {
    // Get CP presales agents only
    presalesAgents = await User.find({ 
      roleId: presalesRole._id,
      statusId: activeStatus._id,
      userType: 'cp_presales',
      deletedAt: null 
    });
    
    if (presalesAgents.length === 0) return null;
    
    const agent = presalesAgents[cpPresalesRoundRobin % presalesAgents.length];
    cpPresalesRoundRobin++;
    
    return agent;
  } else {
    // Get regular presales agents only
    presalesAgents = await User.find({ 
      roleId: presalesRole._id,
      statusId: activeStatus._id,
      $or: [
        { userType: 'regular' },
        { userType: { $exists: false } },
        { userType: null }
      ],
      deletedAt: null 
    });
    
    if (presalesAgents.length === 0) return null;
    
    const agent = presalesAgents[presalesRoundRobin % presalesAgents.length];
    presalesRoundRobin++;
    
    return agent;
  }
}

// Helper function to get next sales agent
async function getNextSalesAgent(centreId, languageId) {
  const salesRole = await Role.findOne({ slug: 'sales_agent' });
  const activeStatus = await Status.findOne({ slug: 'active' });
  if (!salesRole) return null;
  if (!activeStatus) return null;

  // First try to find agent in same center with matching language
  let salesAgents = await User.find({
    roleId: salesRole._id,
    statusId: activeStatus._id,
    centreId: centreId,
    languageIds: languageId,
    deletedAt: null
  });

  // If no agent found with center and language, find any sales agent
  if (salesAgents.length === 0) {
    salesAgents = await User.find({
      roleId: salesRole._id,
      statusId: activeStatus._id,
      deletedAt: null
    });
  }

  if (salesAgents.length === 0) return null;

  // Use round robin for this center
  const centerKey = centreId ? centreId.toString() : 'default';
  if (!salesRoundRobin[centerKey]) {
    salesRoundRobin[centerKey] = 0;
  }

  const agent = salesAgents[salesRoundRobin[centerKey] % salesAgents.length];
  salesRoundRobin[centerKey]++;

  return agent;
}

// Get unsigned leads (must be before parameterized routes)
router.get('/unsigned', authenticateToken, async (req, res) => {
  try {
    const count = await Lead.countDocuments({
      deletedAt: null,
      presalesUserId: null,
      salesUserId: null
    });
    
    res.json({ count });
  } catch (error) {
    console.error('Error fetching unsigned leads:', error);
    res.status(500).json({ error: 'Failed to fetch unsigned leads count' });
  }
});

// Get dropdown data for form (must be before parameterized routes)
router.get('/form/data', async (req, res) => {
  try {
    const [centres, languages, leadSources, projectTypes, houseTypes] = await Promise.all([
      Centre.find({ deletedAt: null }).select('_id name'),
      Language.find({ deletedAt: null }).select('_id name'),
      LeadSource.find({ deletedAt: null }).select('_id name'),
      ProjectAndHouseType.find({ type: 'project', deletedAt: null }).select('_id name'),
      ProjectAndHouseType.find({ type: 'house', deletedAt: null }).select('_id name')
    ]);

    res.json({
      centres,
      languages,
      leadSources,
      projectTypes,
      houseTypes,
      leadValues: [
        { value: 'high value', label: 'High Value' },
        { value: 'low value', label: 'Low Value' }
      ]
    });
  } catch (error) {
    console.error('Error fetching form data:', error);
    res.status(500).json({ error: 'Failed to fetch form data' });
  }
});

// Create lead
router.post('/', async (req, res) => {
  try {
    const {
      name,
      email,
      contactNumber,
      comment,
      assignmentType,
      leadSourceId,
      centreId,
      languageId,
      projectTypeId,
      houseTypeId,
      leadValue
    } = req.body;

    // Validate required fields
    if (!contactNumber || !assignmentType || !leadSourceId) {
      return res.status(400).json({
        error: 'Missing required fields: contactNumber, assignmentType, leadSourceId'
      });
    }

    // Validate contact number format (exactly 10 digits)
    if (!/^\d{10}$/.test(contactNumber)) {
      return res.status(400).json({
        error: 'Contact number must be exactly 10 digits'
      });
    }

    // Get lead source
    const leadSource = await LeadSource.findById(leadSourceId);
    if (!leadSource) {
      return res.status(400).json({ error: 'Lead source not found.' });
    }

    // Prepare lead data
    const leadData = {
      name,
      email,
      contactNumber,
      sourceId: leadSource._id,
      comment
    };
    
    // Only add optional fields if they have values
    if (languageId) leadData.languageId = languageId;
    if (centreId) leadData.centreId = centreId;
    if (projectTypeId) leadData.projectTypeId = projectTypeId;
    if (houseTypeId) leadData.houseTypeId = houseTypeId;
    if (leadValue) leadData.leadValue = leadValue;

    // Assign user and status based on assignment type
    if (assignmentType === 'presales') {
      // Check if lead source is CP to determine assignment type
      const isCpSource = leadSource.slug === 'cp' || leadSource.name.toLowerCase().includes('cp');
      const presalesAgent = await getNextPresalesAgent(isCpSource);
      const leadStatus = await Status.findOne({ slug: 'lead', type: 'leadStatus' });
      if (presalesAgent) {
        leadData.presalesUserId = presalesAgent._id;
      }
      if (leadStatus) {
        leadData.leadStatusId = leadStatus._id;
      }
    } else if (assignmentType === 'sales') {
      const salesAgent = await getNextSalesAgent(centreId, languageId);
      const qualifiedStatus = await Status.findOne({ slug: 'qualified', type: 'leadStatus' });
      const hotSubStatus = await Status.findOne({ slug: 'hot', type: 'leadSubStatus' });
      if (salesAgent) {
        leadData.salesUserId = salesAgent._id;
      }
      if (qualifiedStatus) {
        leadData.leadStatusId = qualifiedStatus._id;
        leadData.qualifiedDate = new Date();
      }
      if (hotSubStatus) {
        leadData.leadSubStatusId = hotSubStatus._id;
        leadData.hotDate = new Date();
      }
    }

    // Create lead with all data
    const lead = new Lead(leadData);
    await lead.save();

    // Create initial lead activity snapshot
    const leadActivity = new LeadActivity({
      leadId: lead._id,
      ...leadData
    });
    await leadActivity.save();

    // Populate the response
    await lead.populate([
      { path: 'presalesUserId', select: 'name email' },
      { path: 'salesUserId', select: 'name email' },
      { path: 'languageId', select: 'name' },
      { path: 'sourceId', select: 'name' },
      { path: 'projectTypeId', select: 'name type' },
      { path: 'houseTypeId', select: 'name type' },
      { path: 'centreId', select: 'name' },
      { path: 'leadStatusId', select: 'name slug' },
      { path: 'leadSubStatusId', select: 'name slug' }
    ]);

    res.status(201).json({
      message: 'Lead created successfully',
      lead: lead
    });

  } catch (error) {
    console.error('Error creating lead:', error);
    res.status(500).json({ error: 'Failed to create lead' });
  }
});

// Bulk upload leads
router.post('/bulk-upload', csvUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Validate file type
    if (!req.file.originalname.toLowerCase().endsWith('.csv') && req.file.mimetype !== 'text/csv') {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Invalid file type. Please upload a CSV file.' });
    }

    // Check file size (max 5MB)
    if (req.file.size > 5 * 1024 * 1024) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'File size too large. Maximum size is 5MB.' });
    }

    const results = [];
    const errors = [];
    const failedEntries = [];
    let rowNumber = 0;
    const requiredColumns = ['name', 'email', 'contactNumber', 'comment', 'leadSource'];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\d{10}$/;

    // Get all lead sources for matching
    const allLeadSources = await LeadSource.find({ deletedAt: null });
    if (allLeadSources.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'No lead sources found. Please create lead sources first.' });
    }


    // Parse CSV file
    const csvData = [];
    let headerValidated = false;
    
    await new Promise((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('headers', (headers) => {
          // Validate CSV headers
          const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
          const missingColumns = requiredColumns.filter(col => 
            !normalizedHeaders.includes(col.toLowerCase())
          );
          
          if (missingColumns.length > 0) {
            reject(new Error(`Missing required columns: ${missingColumns.join(', ')}. Expected columns: ${requiredColumns.join(', ')}`))
            return;
          }
          headerValidated = true;
        })
        .on('data', (data) => {
          if (headerValidated) {
            csvData.push(data);
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    // Check if file is empty
    if (csvData.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'CSV file is empty or contains no valid data rows.' });
    }

    // Check if file has too many rows (max 1000)
    if (csvData.length > 1000) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Too many rows. Maximum 1000 rows allowed per upload.' });
    }

    // Track existing emails to prevent duplicates within the same upload
    const uploadEmails = new Set();
    const existingEmails = new Set();

    // Get existing emails from database
    const existingLeads = await LeadActivity.find(
      { deletedAt: null },
      { email: 1 }
    );
    existingLeads.forEach(lead => existingEmails.add(lead.email.toLowerCase()));

    // Process each row
    for (const row of csvData) {
      rowNumber++;
      try {
        // Normalize and validate data
        const name = row.name ? row.name.toString().trim() : '';
        const email = row.email ? row.email.toString().trim().toLowerCase() : '';
        const contactNumber = row.contactNumber ? row.contactNumber.toString().trim() : '';
        const comment = row.comment ? row.comment.toString().trim() : '';
        const leadSourceText = row.leadSource ? row.leadSource.toString().trim() : '';

        // Validate required fields and collect failed entries
        if (!contactNumber) {
          failedEntries.push({ ...row, failureReason: 'Contact number is required' });
          errors.push(`Row ${rowNumber}: Contact number is required`);
          continue;
        }

        if (!leadSourceText) {
          failedEntries.push({ ...row, failureReason: 'Lead source is required' });
          errors.push(`Row ${rowNumber}: Lead source is required`);
          continue;
        }

        if (!phoneRegex.test(contactNumber)) {
          failedEntries.push({ ...row, failureReason: 'Contact number must be exactly 10 digits' });
          errors.push(`Row ${rowNumber}: Contact number must be exactly 10 digits (${contactNumber})`);
          continue;
        }

        if (name && name.length > 100) {
          failedEntries.push({ ...row, failureReason: 'Name too long (max 100 characters)' });
          errors.push(`Row ${rowNumber}: Name too long (max 100 characters)`);
          continue;
        }

        if (comment && comment.length > 500) {
          failedEntries.push({ ...row, failureReason: 'Comment too long (max 500 characters)' });
          errors.push(`Row ${rowNumber}: Comment too long (max 500 characters)`);
          continue;
        }

        // Add email to upload set
        uploadEmails.add(email);

        // Find matching lead source
        let matchedLeadSource = null;
        const leadSourceLower = leadSourceText.toLowerCase();
        
        // First try exact match
        matchedLeadSource = allLeadSources.find(source => 
          source.name.toLowerCase() === leadSourceLower ||
          source.slug.toLowerCase() === leadSourceLower
        );
        
        // If no exact match, try partial match
        if (!matchedLeadSource) {
          matchedLeadSource = allLeadSources.find(source => 
            source.name.toLowerCase().includes(leadSourceLower) ||
            leadSourceLower.includes(source.name.toLowerCase()) ||
            source.slug.toLowerCase().includes(leadSourceLower) ||
            leadSourceLower.includes(source.slug.toLowerCase())
          );
        }
        
        // Fail if no match found
        if (!matchedLeadSource) {
          failedEntries.push({ ...row, failureReason: `Lead source '${leadSourceText}' not found. Available sources: ${allLeadSources.map(s => s.name).join(', ')}` });
          errors.push(`Row ${rowNumber}: Lead source '${leadSourceText}' not found`);
          continue;
        }

        // Get next presales agent - check if matched source is CP
        const isCpSource = matchedLeadSource.slug === 'cp' || matchedLeadSource.name.toLowerCase().includes('cp');
        const presalesAgent = await getNextPresalesAgent(isCpSource);
        const leadStatus = await Status.findOne({ slug: 'lead', type: 'leadStatus' });

        // Prepare lead data
        const leadData = {
          name: name,
          email: email,
          contactNumber: contactNumber,
          comment: comment,
          sourceId: matchedLeadSource._id
        };

        // Assign to presales agent
        if (presalesAgent) {
          leadData.presalesUserId = presalesAgent._id;
        }
        if (leadStatus) {
          leadData.leadStatusId = leadStatus._id;
        }

        // Create lead with all data
        const lead = new Lead(leadData);
        await lead.save();

        // Create initial lead activity snapshot
        const leadActivity = new LeadActivity({
          leadId: lead._id,
          ...leadData
        });
        await leadActivity.save();

        results.push({
          row: rowNumber,
          leadId: lead.leadID,
          name: name || 'N/A',
          email: email,
          contactNumber: contactNumber,
          leadSource: matchedLeadSource.name,
          assignedTo: presalesAgent ? presalesAgent.name : 'Unassigned'
        });

      } catch (error) {
        console.error(`Error processing row ${rowNumber}:`, error);
        const errorMessage = error.message || 'Unknown error occurred';
        failedEntries.push({
          ...row,
          failureReason: errorMessage
        });
        errors.push(`Row ${rowNumber}: ${errorMessage}`);
      }
    }

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    // Generate failed entries CSV file if there are failures
    let failedFileUrl = null;
    if (failedEntries.length > 0) {
      const timestamp = Date.now();
      const failedFileName = `failed_leads_${timestamp}.csv`;
      const failedFilePath = path.join(__dirname, '../uploads/csv', failedFileName);
      
      // Ensure directory exists
      const uploadDir = path.join(__dirname, '../uploads/csv');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      // Create CSV content with headers
      const headers = ['name', 'email', 'contactNumber', 'comment', 'leadSource', 'failureReason'];
      let csvContent = headers.join(',') + '\n';
      
      // Add failed entries data
      failedEntries.forEach(entry => {
        const row = [
          `"${(entry.name || '').toString().replace(/"/g, '""')}"`,
          `"${(entry.email || '').toString().replace(/"/g, '""')}"`,
          `"${(entry.contactNumber || '').toString().replace(/"/g, '""')}"`,
          `"${(entry.comment || '').toString().replace(/"/g, '""')}"`,
          `"${(entry.leadSource || '').toString().replace(/"/g, '""')}"`,
          `"${(entry.failureReason || '').toString().replace(/"/g, '""')}"`
        ];
        csvContent += row.join(',') + '\n';
      });
      
      // Write CSV file
      fs.writeFileSync(failedFilePath, csvContent, 'utf8');
      failedFileUrl = `/api/leads/download-failed/${failedFileName}`;
    }

    // Determine response status
    const totalRows = csvData.length;
    const successfulRows = results.length;
    const failedRows = errors.length;

    if (successfulRows === 0) {
      return res.status(400).json({
        error: 'No leads were created. Please check the errors and try again.',
        totalRows,
        successful: successfulRows,
        failed: failedRows,
        errors,
        failedFileUrl
      });
    }

    const response = {
      message: `Processed ${totalRows} rows: ${successfulRows} successful, ${failedRows} failed`,
      totalRows,
      successful: successfulRows,
      failed: failedRows,
      results,
      errors,
      failedFileUrl
    };

    // Return partial success if some rows failed
    if (failedRows > 0) {
      return res.status(207).json(response); // 207 Multi-Status
    }

    res.status(201).json(response);

  } catch (error) {
    console.error('Error in bulk upload:', error);
    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    if (error.message.includes('Missing required columns')) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to process bulk upload. Please try again.' });
  }
});

// Get all leads with pagination and filters
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Get user role for filtering
    const user = await User.findById(req.user.userId).populate('roleId');
    const userRole = user?.roleId?.slug;
    
    // Build filter for Lead table
    const filter = { deletedAt: null };
    
    // Role-based filtering
    if (userRole === 'presales_agent') {
      filter.presalesUserId = req.user.userId;
      const leadStatus = await Status.findOne({ slug: 'lead', type: 'leadStatus' });
      if (leadStatus) {
        filter.leadStatusId = leadStatus._id;
      }
    } else if (userRole === 'sales_agent') {
      const wonStatus = await Status.findOne({ slug: 'won', type: 'leadStatus' });
      const lostStatus = await Status.findOne({ slug: 'lost', type: 'leadStatus' });
      
      filter.salesUserId = req.user.userId;
      if (wonStatus || lostStatus) {
        filter.leadStatusId = { 
          $nin: [wonStatus?._id, lostStatus?._id].filter(Boolean)
        };
      }
    } else if (userRole === 'hod_presales' || userRole === 'manager_presales') {
      const leadStatus = await Status.findOne({ slug: 'lead', type: 'leadStatus' });
      if (leadStatus) {
        filter.leadStatusId = leadStatus._id;
      }
    } else if (userRole === 'hod_sales') {
      // HOD sales can only see leads from their center
      filter.centreId = user.centreId;
    } else if (userRole === 'sales_manager') {
      // Sales manager can only see qualified leads from their center
      filter.centreId = user.centreId;
      const qualifiedStatus = await Status.findOne({ slug: 'qualified', type: 'leadStatus' });
      if (qualifiedStatus) {
        filter.leadStatusId = qualifiedStatus._id;
      }
    }
    
    // Apply search filters
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      filter.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { contactNumber: searchRegex }
      ];
    }
    
    if (req.query.source) {
      filter.sourceId = req.query.source;
    }
    
    if (req.query.leadValue) {
      filter.leadValue = req.query.leadValue;
    }
    
    if (req.query.centre) {
      filter.centreId = req.query.centre;
    }
    
    if (req.query.assignedTo) {
      filter.$or = [
        { presalesUserId: req.query.assignedTo },
        { salesUserId: req.query.assignedTo }
      ];
    }
    
    if (req.query.leadStatus) {
      filter.leadStatusId = req.query.leadStatus;
    }
    
    if (req.query.leadSubStatus) {
      filter.leadSubStatusId = req.query.leadSubStatus;
    }
    
    if (req.query.siteVisit) {
      filter.siteVisit = req.query.siteVisit === 'true';
    }
    
    if (req.query.centerVisit) {
      filter.centerVisit = req.query.centerVisit === 'true';
    }
    
    if (req.query.virtualMeeting) {
      filter.virtualMeeting = req.query.virtualMeeting === 'true';
    }
    
    // Date range filters - status-based or creation-based
    if (req.query.dateFrom || req.query.dateTo) {
      let dateField = 'createdAt'; // Default to creation date
      
      // If status or substatus is selected, use appropriate date field
      if (req.query.leadStatus) {
        const selectedStatus = await Status.findById(req.query.leadStatus);
        if (selectedStatus?.slug === 'won') dateField = 'leadWonDate';
        else if (selectedStatus?.slug === 'lost') dateField = 'leadLostDate';
      }
      
      if (req.query.leadSubStatus) {
        const selectedSubStatus = await Status.findById(req.query.leadSubStatus);
        if (selectedSubStatus?.slug === 'hot') dateField = 'updatedAt';
        else if (selectedSubStatus?.slug === 'warm') dateField = 'updatedAt';
        else if (selectedSubStatus?.slug === 'cif') dateField = 'cifDate';
        else if (selectedSubStatus?.slug === 'meeting-arranged') dateField = 'meetingArrangedDate';
      }
      
      // Override with specific activity date fields if those filters are selected
      if (req.query.siteVisit === 'true') dateField = 'siteVisitDate';
      if (req.query.centerVisit === 'true') dateField = 'centerVisitDate';
      if (req.query.virtualMeeting === 'true') dateField = 'virtualMeetingDate';
      
      // Use specific substatus date fields
      if (req.query.leadSubStatus) {
        const selectedSubStatus = await Status.findById(req.query.leadSubStatus);
        if (selectedSubStatus?.slug === 'hot') dateField = 'hotDate';
        else if (selectedSubStatus?.slug === 'warm') dateField = 'warmDate';
        else if (selectedSubStatus?.slug === 'interested') dateField = 'interestedDate';
      }
      
      // Use specific date fields based on status
      if (req.query.leadStatus) {
        const selectedStatus = await Status.findById(req.query.leadStatus);
        if (selectedStatus?.slug === 'qualified') dateField = 'qualifiedDate';
        else if (selectedStatus?.slug === 'lead') dateField = 'createdAt';
      }
      console.log('Using date field for filtering:', dateField);
      filter[dateField] = {};
      if (req.query.dateFrom) {
        filter[dateField].$gte = new Date(req.query.dateFrom);
      }
      if (req.query.dateTo) {
        const toDate = new Date(req.query.dateTo);
        toDate.setHours(23, 59, 59, 999);
        filter[dateField].$lte = toDate;
      }
    }

    // Get leads from Lead table
    const [leads, total] = await Promise.all([
      Lead.find(filter)
        .populate([
          { path: 'presalesUserId', select: 'name email' },
          { path: 'salesUserId', select: 'name email' },
          { path: 'languageId', select: 'name' },
          { path: 'sourceId', select: 'name' },
          { path: 'projectTypeId', select: 'name type' },
          { path: 'houseTypeId', select: 'name type' },
          { path: 'centreId', select: 'name' },
          { path: 'leadStatusId', select: 'name slug' },
          { path: 'leadSubStatusId', select: 'name slug' }
        ])
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Lead.countDocuments(filter)
    ]);

    res.json({
      leads,
      pagination: {
        current: page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// Export leads
router.get('/export', authenticateToken, async (req, res) => {
  try {
    // Get user role for filtering
    const user = await User.findById(req.user.userId).populate('roleId');
    const userRole = user?.roleId?.slug;
    
    // Build filter for Lead table (same as main leads endpoint)
    const filter = { deletedAt: null };
    
    // Role-based filtering
    if (userRole === 'presales_agent') {
      filter.presalesUserId = req.user.userId;
      const leadStatus = await Status.findOne({ slug: 'lead', type: 'leadStatus' });
      if (leadStatus) {
        filter.leadStatusId = leadStatus._id;
      }
    } else if (userRole === 'sales_agent') {
      const wonStatus = await Status.findOne({ slug: 'won', type: 'leadStatus' });
      const lostStatus = await Status.findOne({ slug: 'lost', type: 'leadStatus' });
      
      filter.salesUserId = req.user.userId;
      if (wonStatus || lostStatus) {
        filter.leadStatusId = { 
          $nin: [wonStatus?._id, lostStatus?._id].filter(Boolean)
        };
      }
    } else if (userRole === 'hod_presales' || userRole === 'manager_presales') {
      const leadStatus = await Status.findOne({ slug: 'lead', type: 'leadStatus' });
      if (leadStatus) {
        filter.leadStatusId = leadStatus._id;
      }
    } else if (userRole === 'hod_sales') {
      filter.centreId = user.centreId;
    } else if (userRole === 'sales_manager') {
      filter.centreId = user.centreId;
      const qualifiedStatus = await Status.findOne({ slug: 'qualified', type: 'leadStatus' });
      if (qualifiedStatus) {
        filter.leadStatusId = qualifiedStatus._id;
      }
    }
    
    // Apply search filters
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      filter.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { contactNumber: searchRegex }
      ];
    }
    
    if (req.query.source) filter.sourceId = req.query.source;
    if (req.query.leadValue) filter.leadValue = req.query.leadValue;
    if (req.query.centre) filter.centreId = req.query.centre;
    if (req.query.assignedTo) {
      filter.$or = [
        { presalesUserId: req.query.assignedTo },
        { salesUserId: req.query.assignedTo }
      ];
    }
    if (req.query.leadStatus) filter.leadStatusId = req.query.leadStatus;
    if (req.query.leadSubStatus) filter.leadSubStatusId = req.query.leadSubStatus;
    if (req.query.siteVisit) filter.siteVisit = req.query.siteVisit === 'true';
    if (req.query.centerVisit) filter.centerVisit = req.query.centerVisit === 'true';
    if (req.query.virtualMeeting) filter.virtualMeeting = req.query.virtualMeeting === 'true';
    
    // Date range filters
    if (req.query.dateFrom || req.query.dateTo) {
      let dateField = 'createdAt';
      
      if (req.query.leadStatus) {
        const selectedStatus = await Status.findById(req.query.leadStatus);
        if (selectedStatus?.slug === 'won') dateField = 'leadWonDate';
        else if (selectedStatus?.slug === 'lost') dateField = 'leadLostDate';
        else if (selectedStatus?.slug === 'qualified') dateField = 'qualifiedDate';
        else if (selectedStatus?.slug === 'lead') dateField = 'createdAt';
      }
      
      if (req.query.leadSubStatus) {
        const selectedSubStatus = await Status.findById(req.query.leadSubStatus);
        if (selectedSubStatus?.slug === 'hot') dateField = 'hotDate';
        else if (selectedSubStatus?.slug === 'warm') dateField = 'warmDate';
        else if (selectedSubStatus?.slug === 'interested') dateField = 'interestedDate';
        else if (selectedSubStatus?.slug === 'cif') dateField = 'cifDate';
        else if (selectedSubStatus?.slug === 'meeting-arranged') dateField = 'meetingArrangedDate';
      }
      
      if (req.query.siteVisit === 'true') dateField = 'siteVisitDate';
      if (req.query.centerVisit === 'true') dateField = 'centerVisitDate';
      if (req.query.virtualMeeting === 'true') dateField = 'virtualMeetingDate';
      
      filter[dateField] = {};
      if (req.query.dateFrom) {
        filter[dateField].$gte = new Date(req.query.dateFrom);
      }
      if (req.query.dateTo) {
        const toDate = new Date(req.query.dateTo);
        toDate.setHours(23, 59, 59, 999);
        filter[dateField].$lte = toDate;
      }
    }

    const leads = await Lead.find(filter)
      .populate([
        { path: 'presalesUserId', select: 'name email' },
        { path: 'salesUserId', select: 'name email' },
        { path: 'languageId', select: 'name' },
        { path: 'sourceId', select: 'name' },
        { path: 'projectTypeId', select: 'name type' },
        { path: 'houseTypeId', select: 'name type' },
        { path: 'centreId', select: 'name' },
        { path: 'leadStatusId', select: 'name slug' },
        { path: 'leadSubStatusId', select: 'name slug' }
      ])
      .sort({ createdAt: -1 });

    const csvData = leads.map(lead => ({
      'Lead ID': lead.leadID,
      'Name': lead.name || '',
      'Email': lead.email,
      'Contact Number': lead.contactNumber,
      'Source': lead.sourceId.name,
      'Centre': lead.centreId?.name || '',
      'Assigned To': lead.presalesUserId?.name || lead.salesUserId?.name || 'Unassigned',
      'Assignment Type': lead.presalesUserId ? 'Presales' : lead.salesUserId ? 'Sales' : 'None',
      'Lead Value': lead.leadValue || '',
      'Language': lead.languageId?.name || '',
      'Project Type': lead.projectTypeId?.name || '',
      'House Type': lead.houseTypeId?.name || '',
      'Comment': lead.comment || '',
      'Created At': new Date(lead.createdAt).toLocaleString()
    }));

    res.json(csvData);
  } catch (error) {
    console.error('Error exporting leads:', error);
    res.status(500).json({ error: 'Failed to export leads' });
  }
});

// Get all lead activities for a lead
router.get('/:id/activities', authenticateToken, async (req, res) => {
  try {
    // Check if the lead exists
    const lead = await Lead.findById(req.params.id);
    if (!lead || lead.deletedAt) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Get all lead activities for this lead
    const leadActivities = await LeadActivity.find({ leadId: req.params.id, deletedAt: null })
      .populate([
        { path: 'presalesUserId', select: 'name email' },
        { path: 'salesUserId', select: 'name email' },
        { path: 'updatedPerson', select: 'name email' },
        { path: 'languageId', select: 'name' },
        { path: 'sourceId', select: 'name' },
        { path: 'projectTypeId', select: 'name type' },
        { path: 'houseTypeId', select: 'name type' },
        { path: 'centreId', select: 'name' },
        { path: 'leadStatusId', select: 'name slug' },
        { path: 'leadSubStatusId', select: 'name slug' }
      ])
      .sort({ createdAt: -1 });

    res.json({ leadActivities });
  } catch (error) {
    console.error('Error fetching lead activities:', error);
    res.status(500).json({ error: 'Failed to fetch lead activities' });
  }
});

// Get lead by ID with activity data
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    // Get user role for access control
    const user = await User.findById(req.user.userId).populate('roleId');
    const userRole = user?.roleId?.slug;
    
    // Find the lead
    const lead = await Lead.findById(req.params.id)
      .populate([
        { path: 'presalesUserId', select: 'name email' },
        { path: 'salesUserId', select: 'name email' },
        { path: 'updatedPerson', select: 'name email' },
        { path: 'languageId', select: 'name' },
        { path: 'sourceId', select: 'name' },
        { path: 'projectTypeId', select: 'name type' },
        { path: 'houseTypeId', select: 'name type' },
        { path: 'centreId', select: 'name' },
        { path: 'leadStatusId', select: 'name slug' },
        { path: 'leadSubStatusId', select: 'name slug' }
      ]);

    if (!lead || lead.deletedAt) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    // Check center access for HOD sales
    if (userRole === 'hod_sales' && (!lead.centreId || !lead.centreId.equals(user.centreId))) {
      return res.status(403).json({ error: 'Access denied: Lead not from your center' });
    }
    
    // Check center and qualified status access for sales manager
    if (userRole === 'sales_manager') {
      if (!lead.centreId || !lead.centreId.equals(user.centreId)) {
        return res.status(403).json({ error: 'Access denied: Lead not from your center' });
      }
      const qualifiedStatus = await Status.findOne({ slug: 'qualified', type: 'leadStatus' });
      if (!qualifiedStatus || !lead.leadStatusId.equals(qualifiedStatus._id)) {
        return res.status(403).json({ error: 'Access denied: Only qualified leads allowed' });
      }
    }

    // Get call logs linked to the Lead
    const callLogs = await CallLog.find({ leadId: lead._id, deletedAt: null })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    // Get activity logs linked to the Lead
    const activityLogs = await ActivityLog.find({ leadId: lead._id, deletedAt: null })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      lead: lead,
      callLogs,
      activityLogs
    });
  } catch (error) {
    console.error('Error fetching lead:', error);
    res.status(500).json({ error: 'Failed to fetch lead' });
  }
});

// Get lead activity timeline
router.get('/:id/timeline', authenticateToken, async (req, res) => {
  try {
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid lead ID format' });
    }

    // Find the lead directly
    const lead = await Lead.findById(req.params.id);
    if (!lead || lead.deletedAt) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const actualLeadId = lead._id;

    // Get call logs linked to the actual Lead
    const callLogs = await CallLog.find({ leadId: actualLeadId, deletedAt: null })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    // Get activity logs linked to the actual Lead
    const activityLogs = await ActivityLog.find({ leadId: actualLeadId, deletedAt: null })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    // Combine and sort by date
    const timeline = [
      ...callLogs.map(log => ({
        ...log.toObject(),
        type: 'call',
        title: 'Call Made',
        description: `Call made by ${log.userId.name}`,
        timestamp: log.createdAt
      })),
      ...activityLogs.map(log => ({
        ...log.toObject(),
        type: log.type,
        title: log.type === 'call' ? 'Call Activity' : 'Manual Activity',
        description: log.comment,
        timestamp: log.createdAt
      }))
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json({ timeline });
  } catch (error) {
    console.error('Error fetching timeline:', error);
    res.status(500).json({ error: 'Failed to fetch timeline' });
  }
});

// Create call log
router.post('/:id/call', authenticateToken, async (req, res) => {
  try {
    
    // Determine the actual Lead ID
    let actualLeadId = null;
    
    // Try to find as LeadActivity first
    try {
      const leadActivity = await LeadActivity.findById(req.params.id);
      if (leadActivity) {
        actualLeadId = leadActivity.leadId;
      }
      const lead = await Lead.findById(req.params.id);
      if (lead) {
        actualLeadId = lead._id;
      }
    } catch (err) {
      // If not found as LeadActivity, try as Lead ID directly
    }

    if (!actualLeadId) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const callLog = new CallLog({
      userId: req.user.userId,
      leadId: actualLeadId,
      dateTime: new Date()
    });
    
    await callLog.save();
    await callLog.populate('userId', 'name email');
    
    res.status(201).json({ message: 'Call log created successfully', callLog });
  } catch (error) {
    console.error('Error creating call log:', error);
    res.status(500).json({ error: 'Failed to create call log' });
  }
});

// Create activity log
router.post('/:id/activity', authenticateToken, documentUpload.single('document'), async (req, res) => {
  try {
    const { type, comment } = req.body;
    
    if (!type || !comment) {
      return res.status(400).json({ error: 'Type and comment are required' });
    }

    // Determine the actual Lead ID
    let actualLeadId = null;
    
    // Try to find as LeadActivity first
    try {
      const leadActivity = await LeadActivity.findById(req.params.id);
      if (leadActivity) {
        actualLeadId = leadActivity.leadId;
      }
      const lead = await Lead.findById(req.params.id);
      if (lead) {
        actualLeadId = lead._id;
      }
    } catch (err) {
      // If not found as LeadActivity, try as Lead ID directly
    }

    if (!actualLeadId) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const activityLog = new ActivityLog({
      userId: req.user.userId,
      leadId: actualLeadId,
      type,
      comment,
      document: req.file ? req.file.filename : null
    });

    await activityLog.save();
    await activityLog.populate('userId', 'name email');
    
    res.status(201).json({ message: 'Activity logged successfully', data: activityLog });
  } catch (error) {
    console.error('Error creating activity log:', error);
    res.status(500).json({ error: 'Failed to create activity log' });
  }
});

// Create presales lead activity entry (limited fields)
router.post('/:id/presales-activity', authenticateToken, documentUpload.array('files', 5), async (req, res) => {
  try {
    console.log('Presales activity endpoint called with:', req.params.id);
    console.log('Request body:', req.body);
    
    // Get user role for access control
    const user = await User.findById(req.user.userId).populate('roleId');
    const userRole = user?.roleId?.slug;
    
    // Find the lead
    const lead = await Lead.findById(req.params.id);
    if (!lead || lead.deletedAt) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    // Check center access for HOD sales
    if (userRole === 'hod_sales' && (!lead.centreId || !lead.centreId.equals(user.centreId))) {
      return res.status(403).json({ error: 'Access denied: Lead not from your center' });
    }
    
    // Check center and qualified status access for sales manager
    if (userRole === 'sales_manager') {
      if (!lead.centreId || !lead.centreId.equals(user.centreId)) {
        return res.status(403).json({ error: 'Access denied: Lead not from your center' });
      }
      const qualifiedStatus = await Status.findOne({ slug: 'qualified', type: 'leadStatus' });
      if (!qualifiedStatus || !lead.leadStatusId.equals(qualifiedStatus._id)) {
        return res.status(403).json({ error: 'Access denied: Only qualified leads allowed' });
      }
    }

    console.log('Found lead:', lead._id);

    // Prepare updated lead data with limited fields for presales
    const updatedData = {
      name: req.body.name || lead.name,
      email: req.body.email || lead.email,
      contactNumber: req.body.contactNumber || lead.contactNumber,
      leadStatusId: req.body.leadStatusId || lead.leadStatusId,
      leadSubStatusId: req.body.leadSubStatusId || lead.leadSubStatusId,
      centreId: req.body.centreId || lead.centreId,
      languageId: req.body.languageId || lead.languageId,
      projectTypeId: req.body.projectTypeId || lead.projectTypeId,
      houseTypeId: req.body.houseTypeId || lead.houseTypeId,
      apartmentName: req.body.apartmentName || lead.apartmentName,
      leadValue: req.body.leadValue || lead.leadValue,
      comment: req.body.comment || lead.comment,
      updatedPerson: req.user.userId,
      files: lead.files
    };

    // Handle date fields
    if (req.body.cifDate !== undefined) {
      updatedData.cifDate = req.body.cifDate ? new Date(req.body.cifDate) : null;
    } else {
      updatedData.cifDate = lead.cifDate;
    }
    
    if (req.body.meetingArrangedDate !== undefined) {
      updatedData.meetingArrangedDate = req.body.meetingArrangedDate ? new Date(req.body.meetingArrangedDate) : null;
    } else {
      updatedData.meetingArrangedDate = lead.meetingArrangedDate;
    }

    // Handle file uploads
    if (req.files && req.files.length > 0) {
      updatedData.files = req.files.map(file => ({
        filename: file.filename,
        originalname: file.originalname,
        size: file.size,
        mimetype: file.mimetype
      }));
    }

    // Check if lead status changed
    if (req.body.leadStatusId) {
      const leadStatus = await Status.findById(req.body.leadStatusId);
      console.log('Lead status check:', leadStatus?.slug);
      
      if (leadStatus && leadStatus.slug === 'qualified') {
        console.log('Lead status changed to qualified, assigning to sales team');
        updatedData.qualifiedDate = new Date();
        
        // Auto-assign to sales team using round robin with centre and language
        const salesAgent = await getNextSalesAgent(updatedData.centreId, updatedData.languageId);
        if (salesAgent) {
          console.log('Assigned to sales agent:', salesAgent.name);
          updatedData.salesUserId = salesAgent._id;
          updatedData.presalesUserId = null; // Clear presales assignment
        }
        
        // Set sub-status to hot
        const hotSubStatus = await Status.findOne({ slug: 'hot', type: 'leadSubStatus' });
        if (hotSubStatus) {
          console.log('Set sub-status to hot');
          updatedData.leadSubStatusId = hotSubStatus._id;
          updatedData.hotDate = new Date();
        }
      } else if (leadStatus && leadStatus.slug === 'won') {
        console.log('Lead status changed to won');
        updatedData.leadWonDate = new Date();
        updatedData.leadSubStatusId = null;
        updatedData.presalesUserId = null;
        updatedData.salesUserId = null;
        updatedData.cifDate = null;
        updatedData.meetingArrangedDate = null;
      } else if (leadStatus && leadStatus.slug === 'lost') {
        console.log('Lead status changed to lost');
        updatedData.leadLostDate = new Date();
        updatedData.leadSubStatusId = null;
        updatedData.presalesUserId = null;
        updatedData.salesUserId = null;
        updatedData.cifDate = null;
        updatedData.meetingArrangedDate = null;
      }
    }
    
    // Check if substatus changed
    if (req.body.leadSubStatusId) {
      const subStatus = await Status.findById(req.body.leadSubStatusId);
      if (subStatus) {
        if (subStatus.slug === 'hot') updatedData.hotDate = new Date();
        else if (subStatus.slug === 'warm') updatedData.warmDate = new Date();
        else if (subStatus.slug === 'interested') updatedData.interestedDate = new Date();
      }
    }

    console.log('Updating lead with data:', updatedData);

    // Update the lead (this will trigger the pre-save hook to create LeadActivity snapshot)
    Object.assign(lead, updatedData);
    await lead.save();

    // Populate the response
    await lead.populate([
      { path: 'presalesUserId', select: 'name email' },
      { path: 'salesUserId', select: 'name email' },
      { path: 'updatedPerson', select: 'name email' },
      { path: 'languageId', select: 'name' },
      { path: 'sourceId', select: 'name' },
      { path: 'projectTypeId', select: 'name type' },
      { path: 'houseTypeId', select: 'name type' },
      { path: 'centreId', select: 'name' },
      { path: 'leadStatusId', select: 'name slug' },
      { path: 'leadSubStatusId', select: 'name slug' }
    ]);

    console.log('Lead updated successfully');

    res.status(200).json({ 
      message: 'Lead updated successfully', 
      lead: lead 
    });
  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

// Create new lead activity entry
router.post('/:id/lead-activity', authenticateToken, documentUpload.array('files', 5), async (req, res) => {
  try {
    // Get user role for access control
    const user = await User.findById(req.user.userId).populate('roleId');
    const userRole = user?.roleId?.slug;
    
    // Find the lead
    const lead = await Lead.findById(req.params.id);
    if (!lead || lead.deletedAt) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    // Check center access for HOD sales
    if (userRole === 'hod_sales' && (!lead.centreId || !lead.centreId.equals(user.centreId))) {
      return res.status(403).json({ error: 'Access denied: Lead not from your center' });
    }
    
    // Check center and qualified status access for sales manager
    if (userRole === 'sales_manager') {
      if (!lead.centreId || !lead.centreId.equals(user.centreId)) {
        return res.status(403).json({ error: 'Access denied: Lead not from your center' });
      }
      const qualifiedStatus = await Status.findOne({ slug: 'qualified', type: 'leadStatus' });
      if (!qualifiedStatus || !lead.leadStatusId.equals(qualifiedStatus._id)) {
        return res.status(403).json({ error: 'Access denied: Only qualified leads allowed' });
      }
    }

    // Prepare updated lead data
    const updatedData = {
      name: req.body.name || lead.name,
      email: req.body.email || lead.email,
      contactNumber: req.body.contactNumber || lead.contactNumber,
      sourceId: req.body.sourceId || lead.sourceId,
      updatedPerson: req.user.userId
    };

    // Add all other fields from request body or existing data
    const fieldsToUpdate = [
      'presalesUserId', 'salesUserId', 'leadStatusId', 'leadSubStatusId',
      'languageId', 'centreId', 'projectTypeId', 'projectValue', 'apartmentName',
      'houseTypeId', 'expectedPossessionDate', 'leadValue',
      'siteVisit', 'siteVisitDate', 'centerVisit', 'centerVisitDate',
      'virtualMeeting', 'virtualMeetingDate', 'meetingArrangedDate', 'comment', 'cifDate'
    ];

    fieldsToUpdate.forEach(field => {
      if (req.body[field] !== undefined) {
        updatedData[field] = req.body[field] || null;
      } else {
        updatedData[field] = lead[field];
      }
    });

    // Handle date fields
    if (req.body.cifDate !== undefined) {
      updatedData.cifDate = req.body.cifDate ? new Date(req.body.cifDate) : null;
    } else {
      updatedData.cifDate = lead.cifDate;
    }
    
    if (req.body.meetingArrangedDate !== undefined) {
      updatedData.meetingArrangedDate = req.body.meetingArrangedDate ? new Date(req.body.meetingArrangedDate) : null;
    } else {
      updatedData.meetingArrangedDate = lead.meetingArrangedDate;
    }

    // Handle file uploads
    if (req.files && req.files.length > 0) {
      updatedData.files = req.files.map(file => ({
        filename: file.filename,
        originalname: file.originalname,
        size: file.size,
        mimetype: file.mimetype
      }));
    }

    // Check if lead status changed and handle accordingly
    if (req.body.leadStatusId) {
      const leadStatus = await Status.findById(req.body.leadStatusId);
      if (leadStatus && leadStatus.slug === 'qualified') {
        updatedData.qualifiedDate = new Date();
        
        // Assign to sales agent using round robin
        const salesAgent = await getNextSalesAgent(updatedData.centreId, updatedData.languageId);
        if (salesAgent) {
          updatedData.salesUserId = salesAgent._id;
          // Clear presales assignment when moving to sales
          updatedData.presalesUserId = null;
        }
        
        // Set default sub-status for qualified leads
        if (!req.body.leadSubStatusId) {
          const hotSubStatus = await Status.findOne({ slug: 'hot', type: 'leadSubStatus' });
          if (hotSubStatus) {
            updatedData.leadSubStatusId = hotSubStatus._id;
            updatedData.hotDate = new Date();
          }
        }
      } else if (leadStatus && leadStatus.slug === 'won') {
        updatedData.leadWonDate = new Date();
        updatedData.leadSubStatusId = null;
        updatedData.presalesUserId = null;
        updatedData.salesUserId = null;
        updatedData.cifDate = null;
        updatedData.meetingArrangedDate = null;
      } else if (leadStatus && leadStatus.slug === 'lost') {
        updatedData.leadLostDate = new Date();
        updatedData.leadSubStatusId = null;
        updatedData.presalesUserId = null;
        updatedData.salesUserId = null;
        updatedData.cifDate = null;
        updatedData.meetingArrangedDate = null;
      }
    }
    
    // Check if substatus changed
    if (req.body.leadSubStatusId) {
      const subStatus = await Status.findById(req.body.leadSubStatusId);
      if (subStatus) {
        if (subStatus.slug === 'hot') updatedData.hotDate = new Date();
        else if (subStatus.slug === 'warm') updatedData.warmDate = new Date();
        else if (subStatus.slug === 'interested') updatedData.interestedDate = new Date();
      }
    }

    // Update the lead (this will trigger the pre-save hook to create LeadActivity snapshot)
    Object.assign(lead, updatedData);
    await lead.save();

    // Populate the response
    await lead.populate([
      { path: 'presalesUserId', select: 'name email' },
      { path: 'salesUserId', select: 'name email' },
      { path: 'updatedPerson', select: 'name email' },
      { path: 'languageId', select: 'name' },
      { path: 'sourceId', select: 'name' },
      { path: 'projectTypeId', select: 'name type' },
      { path: 'houseTypeId', select: 'name type' },
      { path: 'centreId', select: 'name' },
      { path: 'leadStatusId', select: 'name slug' },
      { path: 'leadSubStatusId', select: 'name slug' }
    ]);

    res.status(200).json({ 
      message: 'Lead updated successfully', 
      lead: lead 
    });
  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

// Update lead
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    // Get user role for access control
    const user = await User.findById(req.user.userId).populate('roleId');
    const userRole = user?.roleId?.slug;
    
    const lead = await Lead.findById(req.params.id);
    if (!lead || lead.deletedAt) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    // Check center access for HOD sales
    if (userRole === 'hod_sales' && (!lead.centreId || !lead.centreId.equals(user.centreId))) {
      return res.status(403).json({ error: 'Access denied: Lead not from your center' });
    }
    
    // Check center and qualified status access for sales manager
    if (userRole === 'sales_manager') {
      if (!lead.centreId || !lead.centreId.equals(user.centreId)) {
        return res.status(403).json({ error: 'Access denied: Lead not from your center' });
      }
      const qualifiedStatus = await Status.findOne({ slug: 'qualified', type: 'leadStatus' });
      if (!qualifiedStatus || !lead.leadStatusId.equals(qualifiedStatus._id)) {
        return res.status(403).json({ error: 'Access denied: Only qualified leads allowed' });
      }
    }

    // Update fields
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined && req.body[key] !== '') {
        lead[key] = req.body[key];
      }
    });
    
    // Check if lead status changed and set appropriate dates
    if (req.body.leadStatusId) {
      const leadStatus = await Status.findById(req.body.leadStatusId);
      if (leadStatus && leadStatus.slug === 'qualified') {
        lead.qualifiedDate = new Date();
      } else if (leadStatus && leadStatus.slug === 'won') {
        lead.leadWonDate = new Date();
      } else if (leadStatus && leadStatus.slug === 'lost') {
        lead.leadLostDate = new Date();
      }
    }
    
    // Check if substatus changed and set appropriate dates
    if (req.body.leadSubStatusId) {
      const subStatus = await Status.findById(req.body.leadSubStatusId);
      if (subStatus) {
        if (subStatus.slug === 'hot') lead.hotDate = new Date();
        else if (subStatus.slug === 'warm') lead.warmDate = new Date();
        else if (subStatus.slug === 'interested') lead.interestedDate = new Date();
      }
    }

    await lead.save();
    
    // Populate the response
    await lead.populate([
      { path: 'presalesUserId', select: 'name email' },
      { path: 'salesUserId', select: 'name email' },
      { path: 'languageId', select: 'name' },
      { path: 'sourceId', select: 'name' },
      { path: 'projectTypeId', select: 'name type' },
      { path: 'houseTypeId', select: 'name type' },
      { path: 'centreId', select: 'name' },
      { path: 'leadStatusId', select: 'name slug' },
      { path: 'leadSubStatusId', select: 'name slug' }
    ]);

    res.json({ message: 'Lead updated successfully', lead: lead });
  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

// Delete lead
router.delete('/:id', async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead || lead.deletedAt) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Soft delete the lead
    lead.deletedAt = new Date();
    await lead.save();

    // Also soft delete all related lead activities
    await LeadActivity.updateMany(
      { leadId: lead._id, deletedAt: null },
      { deletedAt: new Date() }
    );

    res.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    console.error('Error deleting lead:', error);
    res.status(500).json({ error: 'Failed to delete lead' });
  }
});

// Assign lead to user
router.post('/:id/assign', authenticateToken, async (req, res) => {
  try {
    const { presalesUserId, salesUserId } = req.body;
    
    const lead = await Lead.findById(req.params.id);
    if (!lead || lead.deletedAt) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const updateData = {};
    if (presalesUserId) updateData.presalesUserId = presalesUserId;
    if (salesUserId) updateData.salesUserId = salesUserId;
    updateData.updatedPerson = req.user.userId;

    Object.assign(lead, updateData);
    await lead.save();

    await lead.populate([
      { path: 'presalesUserId', select: 'name email' },
      { path: 'salesUserId', select: 'name email' }
    ]);

    res.json({ message: 'Lead assigned successfully', lead });
  } catch (error) {
    console.error('Error assigning lead:', error);
    res.status(500).json({ error: 'Failed to assign lead' });
  }
});

// Helper function to get next presales agent for specific language using dedicated round-robin
async function getNextPresalesAgentForLanguage(languageId) {
  const presalesRole = await Role.findOne({ slug: 'presales_agent' });
  const activeStatus = await Status.findOne({ slug: 'active' });
  if (!presalesRole || !activeStatus) return null;

  const presalesAgents = await User.find({ 
    roleId: presalesRole._id,
    statusId: activeStatus._id,
    languageIds: languageId,
    deletedAt: null 
  }).sort({ name: 1 });
  
  if (presalesAgents.length === 0) return null;
  
  if (!languageRoundRobin[languageId]) {
    languageRoundRobin[languageId] = 0;
  }
  
  const agent = presalesAgents[languageRoundRobin[languageId] % presalesAgents.length];
  languageRoundRobin[languageId]++;
  
  return agent;
}

// Helper function to check if user can handle specific language
function userCanHandleLanguage(user, languageId) {
  if (!user.languageIds || !languageId) return false;
  return user.languageIds.some(lang => 
    (typeof lang === 'string' ? lang : lang._id || lang).toString() === languageId.toString()
  );
}

// Change language with automatic assignment logic
router.post('/:id/change-language', authenticateToken, async (req, res) => {
  try {
    const { languageId } = req.body;
    
    if (!languageId) {
      return res.status(400).json({ error: 'Language ID is required' });
    }

    const lead = await Lead.findById(req.params.id);
    if (!lead || lead.deletedAt) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const currentUser = await User.findById(req.user.userId);
    if (!currentUser) {
      return res.status(401).json({ error: 'User not found' });
    }

    let assignedUserId = null;
    let assignmentMessage = '';

    const canHandleLanguage = userCanHandleLanguage(currentUser, languageId);

    if (canHandleLanguage) {
      assignedUserId = currentUser._id;
      assignmentMessage = 'Language changed. Lead remains with current user.';
    } else {
      const availableAgent = await getNextPresalesAgentForLanguage(languageId);
      
      if (availableAgent) {
        assignedUserId = availableAgent._id;
        assignmentMessage = `Language changed. Lead reassigned to ${availableAgent.name} via round-robin.`;
      } else {
        assignedUserId = currentUser._id;
        assignmentMessage = 'Language changed. No agents available for this language, lead remains with current user.';
      }
    }

    lead.languageId = languageId;
    lead.presalesUserId = assignedUserId;
    lead.updatedPerson = req.user.userId;
    lead.comment = assignmentMessage;
    
    await lead.save();

    await lead.populate([
      { path: 'presalesUserId', select: 'name email' },
      { path: 'salesUserId', select: 'name email' },
      { path: 'languageId', select: 'name' },
      { path: 'sourceId', select: 'name' },
      { path: 'projectTypeId', select: 'name type' },
      { path: 'houseTypeId', select: 'name type' },
      { path: 'centreId', select: 'name' },
      { path: 'leadStatusId', select: 'name slug' },
      { path: 'leadSubStatusId', select: 'name slug' }
    ]);

    res.json({ 
      message: assignmentMessage,
      lead: lead
    });
  } catch (error) {
    console.error('Error changing language:', error);
    res.status(500).json({ error: 'Failed to change language' });
  }
});

// Download failed entries CSV file
router.get('/download-failed/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, '../uploads/csv', filename);
  
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'Failed entries file not found' });
  }
});

// Google Ads webhook endpoint
router.post('/webhook/google-ads', async (req, res) => {
  try {
    console.log('Google Ads webhook received:', req.body);
    
    // Store webhook data in history
    const historyData = new GoogleAdsHistory(req.body);
    await historyData.save();
    
    // Extract data from user_column_data
    const userData = req.body.user_column_data || [];
    let name = '', email = '', phone = '';
    
    userData.forEach(item => {
      if (item.column_id === 'FULL_NAME') {
        name = item.string_value;
      } else if (item.column_id === 'EMAIL') {
        email = item.string_value;
      } else if (item.column_id === 'PHONE_NUMBER' || item.column_id === 'WORK_PHONE') {
        if (!phone) phone = item.string_value;
      }
    });
    
    // Clean phone number (remove +1, spaces, etc.)
    if (phone) {
      phone = phone.replace(/[^\d]/g, '');
      if (phone.startsWith('1') && phone.length === 11) {
        phone = phone.substring(1);
      }
    }
    
    // Validate required fields
    if (!phone || phone.length !== 10) {
      historyData.error = 'Invalid phone number format';
      await historyData.save();
      return res.status(400).json({ error: 'Valid 10-digit phone number is required' });
    }
    
    // Get or create Google Ads lead source
    let leadSource = await LeadSource.findOne({ slug: 'google' });
    if (!leadSource) {
      leadSource = new LeadSource({
        name: 'Google Ads',
        slug: 'google',
        description: 'Leads from Google Ads campaigns'
      });
      await leadSource.save();
    }
    
    // Get lead status
    const leadStatus = await Status.findOne({ slug: 'lead', type: 'leadStatus' });
    
    // Get next presales agent
    const presalesAgent = await getNextPresalesAgent();
    
    // Prepare lead data
    const leadData = {
      name: name || '',
      email: email || '',
      contactNumber: phone,
      sourceId: leadSource._id,
      comment: `Google Ads Lead - Campaign ID: ${req.body.campaign_id || 'N/A'}, Ad Group ID: ${req.body.adgroup_id || 'N/A'}, Form ID: ${req.body.form_id || 'N/A'}`
    };
    
    // Assign to presales agent and set status
    if (presalesAgent) {
      leadData.presalesUserId = presalesAgent._id;
    }
    if (leadStatus) {
      leadData.leadStatusId = leadStatus._id;
    }
    
    // Create lead
    const lead = new Lead(leadData);
    await lead.save();
    
    // Create initial lead activity snapshot
    const leadActivity = new LeadActivity({
      leadId: lead._id,
      ...leadData
    });
    await leadActivity.save();
    
    // Update history with created lead ID
    historyData.leadId = lead._id;
    historyData.processed = true;
    await historyData.save();
    
    res.status(201).json({
      success: true,
      message: 'Lead created successfully',
      leadId: lead.leadID
    });
    
  } catch (error) {
    console.error('Google Ads webhook error:', error);
    
    // Update history with error if it exists
    if (req.body.lead_id) {
      try {
        await GoogleAdsHistory.findOneAndUpdate(
          { lead_id: req.body.lead_id },
          { error: error.message }
        );
      } catch (updateError) {
        console.error('Error updating history:', updateError);
      }
    }
    
    res.status(500).json({ 
      success: false,
      error: 'Failed to process lead' 
    });
  }
});

// Serve activity documents
router.get('/document/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, '../uploads/documents', filename);
  
  if (fs.existsSync(filePath)) {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png'
    };
    
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'Document not found' });
  }
});

module.exports = router;