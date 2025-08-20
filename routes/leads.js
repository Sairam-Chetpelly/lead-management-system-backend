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
let salesRoundRobin = {};

// Helper function to get next presales agent
async function getNextPresalesAgent() {
  const presalesRole = await Role.findOne({ slug: 'presales_agent' });
  const activeStatus = await Status.findOne({ slug: 'active' });
  if (!presalesRole) return null;
  if (!activeStatus) return null;

  const presalesAgents = await User.find({ 
    roleId: presalesRole._id,
    statusId: activeStatus._id,
    deletedAt: null 
  });
  
  if (presalesAgents.length === 0) return null;
  
  const agent = presalesAgents[presalesRoundRobin % presalesAgents.length];
  presalesRoundRobin++;
  
  return agent;
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
        { value: 'medium value', label: 'Medium Value' },
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
      centreId,
      languageId,
      projectTypeId,
      houseTypeId,
      leadValue,
      notes,
      sourceId
    } = req.body;

    // Validate required fields
    if (!email || !contactNumber || !assignmentType || !sourceId) {
      return res.status(400).json({
        error: 'Missing required fields: email, contactNumber, assignmentType, sourceId'
      });
    }

    // Create lead
    const lead = new Lead();
    await lead.save();

    // Prepare lead activity data (filter out empty strings)
    const leadActivityData = {
      leadId: lead._id,
      name,
      email,
      contactNumber,
      sourceId
    };
    
    // Only add optional fields if they have values
    if (comment) leadActivityData.comment = comment;
    if (notes) leadActivityData.notes = notes;
    if (languageId) leadActivityData.languageId = languageId;
    if (centreId) leadActivityData.centreId = centreId;
    if (projectTypeId) leadActivityData.projectTypeId = projectTypeId;
    if (houseTypeId) leadActivityData.houseTypeId = houseTypeId;
    if (leadValue) leadActivityData.leadValue = leadValue;

    // Assign user and status based on assignment type
    if (assignmentType === 'presales') {
      const presalesAgent = await getNextPresalesAgent();
      const leadStatus = await Status.findOne({ slug: 'lead', type: 'leadStatus' });
      if (presalesAgent) {
        leadActivityData.presalesUserId = presalesAgent._id;
      }
      if (leadStatus) {
        leadActivityData.leadStatusId = leadStatus._id;
      }
    } else if (assignmentType === 'sales') {
      const salesAgent = await getNextSalesAgent(centreId, languageId);
      const qualifiedStatus = await Status.findOne({ slug: 'qualified', type: 'leadStatus' });
      const hotSubStatus = await Status.findOne({ slug: 'hot', type: 'leadSubStatus' });
      if (salesAgent) {
        leadActivityData.salesUserId = salesAgent._id;
      }
      if (qualifiedStatus) {
        leadActivityData.leadStatusId = qualifiedStatus._id;
      }
      if (hotSubStatus) {
        leadActivityData.leadSubStatusId = hotSubStatus._id;
      }
    }

    // Create lead activity
    const leadActivity = new LeadActivity(leadActivityData);
    await leadActivity.save();

    // Populate the response
    await leadActivity.populate([
      { path: 'leadId' },
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
      lead: leadActivity
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
    let rowNumber = 0;
    const requiredColumns = ['name', 'email', 'contactNumber', 'comment'];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[\d\s\+\-\(\)]{10,15}$/;

    // Get default lead source
    const defaultLeadSource = await LeadSource.findOne({ 
      slug: 'excel', 
      deletedAt: null 
    });
    if (!defaultLeadSource) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'No lead source found. Please create a lead source first.' });
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

        // Validate required fields
        if (!email) {
          errors.push(`Row ${rowNumber}: Email is required`);
          continue;
        }

        if (!contactNumber) {
          errors.push(`Row ${rowNumber}: Contact number is required`);
          continue;
        }

        // Validate email format
        if (!emailRegex.test(email)) {
          errors.push(`Row ${rowNumber}: Invalid email format (${email})`);
          continue;
        }

        // Validate phone number format
        if (!phoneRegex.test(contactNumber)) {
          errors.push(`Row ${rowNumber}: Invalid contact number format (${contactNumber})`);
          continue;
        }

        // // Check for duplicate email in database
        // if (existingEmails.has(email)) {
        //   errors.push(`Row ${rowNumber}: Email already exists in database (${email})`);
        //   continue;
        // }

        // Check for duplicate email in current upload
        // if (uploadEmails.has(email)) {
        //   errors.push(`Row ${rowNumber}: Duplicate email in upload file (${email})`);
        //   continue;
        // }

        // Validate name length
        if (name && name.length > 100) {
          errors.push(`Row ${rowNumber}: Name too long (max 100 characters)`);
          continue;
        }

        // Validate comment length
        if (comment && comment.length > 500) {
          errors.push(`Row ${rowNumber}: Comment too long (max 500 characters)`);
          continue;
        }

        // Add email to upload set
        uploadEmails.add(email);

        // Create lead
        const lead = new Lead();
        await lead.save();

        // Get next presales agent (round robin)
        const presalesAgent = await getNextPresalesAgent();
        const leadStatus = await Status.findOne({ slug: 'lead', type: 'leadStatus' });

        // Prepare lead activity data
        const leadActivityData = {
          leadId: lead._id,
          name: name,
          email: email,
          contactNumber: contactNumber,
          comment: comment,
          sourceId: defaultLeadSource._id
        };

        // Assign to presales agent
        if (presalesAgent) {
          leadActivityData.presalesUserId = presalesAgent._id;
        }
        if (leadStatus) {
          leadActivityData.leadStatusId = leadStatus._id;
        }

        // Create lead activity
        const leadActivity = new LeadActivity(leadActivityData);
        await leadActivity.save();

        results.push({
          row: rowNumber,
          leadId: lead.leadID,
          name: name || 'N/A',
          email: email,
          contactNumber: contactNumber,
          assignedTo: presalesAgent ? presalesAgent.name : 'Unassigned'
        });

      } catch (error) {
        console.error(`Error processing row ${rowNumber}:`, error);
        errors.push(`Row ${rowNumber}: ${error.message}`);
      }
    }

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

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
        errors
      });
    }

    const response = {
      message: `Processed ${totalRows} rows: ${successfulRows} successful, ${failedRows} failed`,
      totalRows,
      successful: successfulRows,
      failed: failedRows,
      results,
      errors
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
    
    // Get unique lead IDs first, then get the latest activity for each
    const pipeline = [
      { $match: { deletedAt: null } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$leadId',
          latestActivity: { $first: '$$ROOT' }
        }
      },
      { $replaceRoot: { newRoot: '$latestActivity' } }
    ];
    
    // Apply filters to the pipeline - filter AFTER getting latest activity
    const matchStage = { deletedAt: null };
    
    // Role-based filtering - apply after grouping
    let postGroupFilter = {};
    if (userRole === 'presales_agent') {
      postGroupFilter = {
        presalesUserId: new mongoose.Types.ObjectId(req.user.userId)
      };
    } else if (userRole === 'hod_presales' || userRole === 'manager_presales') {
      const leadStatus = await Status.findOne({ slug: 'lead', type: 'leadStatus' });
      if (leadStatus) {
        postGroupFilter.leadStatusId = leadStatus._id;
      }
    }
    
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      matchStage.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { contactNumber: searchRegex }
      ];
    }
    
    if (req.query.source) {
      matchStage.sourceId = new mongoose.Types.ObjectId(req.query.source);
    }
    
    if (req.query.leadValue) {
      matchStage.leadValue = req.query.leadValue;
    }
    
    if (req.query.centre) {
      matchStage.centreId = new mongoose.Types.ObjectId(req.query.centre);
    }
    
    if (req.query.assignedTo) {
      const assignedToId = new mongoose.Types.ObjectId(req.query.assignedTo);
      matchStage.$or = [
        { presalesUserId: assignedToId },
        { salesUserId: assignedToId }
      ];
    }
    
    if (req.query.leadStatus) {
      matchStage.leadStatusId = new mongoose.Types.ObjectId(req.query.leadStatus);
    }
    
    if (req.query.leadSubStatus) {
      matchStage.leadSubStatusId = new mongoose.Types.ObjectId(req.query.leadSubStatus);
    }
    
    // Date range filters
    if (req.query.dateFrom || req.query.dateTo) {
      matchStage.createdAt = {};
      if (req.query.dateFrom) {
        matchStage.createdAt.$gte = new Date(req.query.dateFrom);
      }
      if (req.query.dateTo) {
        const toDate = new Date(req.query.dateTo);
        toDate.setHours(23, 59, 59, 999); // End of day
        matchStage.createdAt.$lte = toDate;
      }
    }

    pipeline[0].$match = matchStage;
    
    // Add post-group filtering for role-based access
    if (Object.keys(postGroupFilter).length > 0) {
      pipeline.push({ $match: postGroupFilter });
    }
    
    // Add pagination
    pipeline.push(
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit }
    );

    const leads = await LeadActivity.aggregate(pipeline);
    
    // Populate the results
    await LeadActivity.populate(leads, [
      { path: 'leadId' },
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

    // Get total count for pagination
    const totalPipeline = [
      { $match: matchStage },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$leadId',
          latestActivity: { $first: '$$ROOT' }
        }
      },
      { $replaceRoot: { newRoot: '$latestActivity' } }
    ];
    
    // Add post-group filtering for total count too
    if (Object.keys(postGroupFilter).length > 0) {
      totalPipeline.push({ $match: postGroupFilter });
    }
    
    totalPipeline.push({ $count: 'total' });
    
    const totalResult = await LeadActivity.aggregate(totalPipeline);
    const total = totalResult.length > 0 ? totalResult[0].total : 0;

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
router.get('/export', async (req, res) => {
  try {
    const leads = await LeadActivity.find({ deletedAt: null })
      .populate([
        { path: 'leadId' },
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
      'Lead ID': lead.leadId.leadID,
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
      'Notes': lead.notes || '',
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
    // Determine the actual Lead ID
    let actualLeadId = null;
    
    // Try to find as LeadActivity first
    try {
      const leadActivity = await LeadActivity.findById(req.params.id);
      if (leadActivity) {
        actualLeadId = leadActivity.leadId;
      }
    } catch (err) {
      // If not found as LeadActivity, try as Lead ID directly
      const lead = await Lead.findById(req.params.id);
      if (lead) {
        actualLeadId = lead._id;
      }
    }

    if (!actualLeadId) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Get all lead activities for this lead
    const leadActivities = await LeadActivity.find({ leadId: actualLeadId, deletedAt: null })
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
    // First check if the ID is a LeadActivity ID or Lead ID
    let leadActivity = null;
    let actualLeadId = null;
    
    // Try to find as LeadActivity first (for backward compatibility)
    try {
      leadActivity = await LeadActivity.findById(req.params.id)
        .populate([
          { path: 'leadId' },
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
      
      if (leadActivity) {
        actualLeadId = leadActivity.leadId._id;
      }
    } catch (err) {
      // If not found as LeadActivity, try as Lead ID directly
      const lead = await Lead.findById(req.params.id);
      if (lead) {
        actualLeadId = lead._id;
        // Get the latest LeadActivity for this lead
        leadActivity = await LeadActivity.findOne({ leadId: actualLeadId, deletedAt: null })
          .populate([
            { path: 'leadId' },
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
      }
    }

    if (!leadActivity || !actualLeadId) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Get call logs linked to the actual Lead
    const callLogs = await CallLog.find({ leadId: actualLeadId, deletedAt: null })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    // Get activity logs linked to the actual Lead
    const activityLogs = await ActivityLog.find({ leadId: actualLeadId, deletedAt: null })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      lead: leadActivity,
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
    // Determine the actual Lead ID
    let actualLeadId = null;
    
    // Try to find as LeadActivity first
    try {
      const leadActivity = await LeadActivity.findById(req.params.id);
      if (leadActivity) {
        actualLeadId = leadActivity.leadId;
      }
    } catch (err) {
      // If not found as LeadActivity, try as Lead ID directly
      const lead = await Lead.findById(req.params.id);
      if (lead) {
        actualLeadId = lead._id;
      }
    }

    if (!actualLeadId) {
      return res.status(404).json({ error: 'Lead not found' });
    }

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
    
    // Determine the actual Lead ID
    let actualLeadId = null;
    let existingLeadActivity = null;
    
    // Try to find as LeadActivity first
    try {
      existingLeadActivity = await LeadActivity.findById(req.params.id);
      if (existingLeadActivity) {
        actualLeadId = existingLeadActivity.leadId;
      }
    } catch (err) {
      // If not found as LeadActivity, try as Lead ID directly
      const lead = await Lead.findById(req.params.id);
      if (lead) {
        actualLeadId = lead._id;
        existingLeadActivity = await LeadActivity.findOne({ leadId: actualLeadId, deletedAt: null })
          .sort({ createdAt: -1 });
      }
    }

    if (!actualLeadId || !existingLeadActivity) {
      console.log('Lead not found:', { actualLeadId, existingLeadActivity });
      return res.status(404).json({ error: 'Lead not found' });
    }

    console.log('Found lead:', actualLeadId);

    // Prepare new lead activity data with limited fields for presales
    const newLeadActivityData = {
      leadId: actualLeadId,
      name: req.body.name || existingLeadActivity.name,
      email: req.body.email || existingLeadActivity.email,
      contactNumber: req.body.contactNumber || existingLeadActivity.contactNumber,
      sourceId: existingLeadActivity.sourceId, // Keep original source (disabled for presales)
      leadStatusId: req.body.leadStatusId || existingLeadActivity.leadStatusId,
      centreId: req.body.centreId || existingLeadActivity.centreId,
      languageId: req.body.languageId || existingLeadActivity.languageId,
      projectTypeId: req.body.projectTypeId || existingLeadActivity.projectTypeId,
      houseTypeId: req.body.houseTypeId || existingLeadActivity.houseTypeId,
      apartmentName: req.body.apartmentName || existingLeadActivity.apartmentName,
      leadValue: req.body.leadValue || existingLeadActivity.leadValue,
      notes: req.body.notes || existingLeadActivity.notes,
      comment: req.body.comment || '',
      updatedPerson: req.user.userId,
      // Keep existing values for other fields
      presalesUserId: existingLeadActivity.presalesUserId,
      salesUserId: existingLeadActivity.salesUserId,
      leadSubStatusId: existingLeadActivity.leadSubStatusId,
      projectValue: existingLeadActivity.projectValue,
      expectedPossessionDate: existingLeadActivity.expectedPossessionDate,
      paymentMethod: existingLeadActivity.paymentMethod,
      siteVisit: existingLeadActivity.siteVisit,
      siteVisitDate: existingLeadActivity.siteVisitDate,
      centerVisit: existingLeadActivity.centerVisit,
      centerVisitDate: existingLeadActivity.centerVisitDate,
      virtualMeeting: existingLeadActivity.virtualMeeting,
      virtualMeetingDate: existingLeadActivity.virtualMeetingDate,

    };

    // Handle file uploads
    if (req.files && req.files.length > 0) {
      newLeadActivityData.files = req.files.map(file => ({
        filename: file.filename,
        originalname: file.originalname,
        size: file.size,
        mimetype: file.mimetype
      }));
    }

    // Check if lead status changed to qualified
    if (req.body.leadStatusId) {
      const leadStatus = await Status.findById(req.body.leadStatusId);
      console.log('Lead status check:', leadStatus?.slug);
      
      if (leadStatus && leadStatus.slug === 'qualified') {
        console.log('Lead status changed to qualified, assigning to sales team');
        
        // Auto-assign to sales team using round robin with centre and language
        const salesAgent = await getNextSalesAgent(newLeadActivityData.centreId, newLeadActivityData.languageId);
        if (salesAgent) {
          console.log('Assigned to sales agent:', salesAgent.name);
          newLeadActivityData.salesUserId = salesAgent._id;
          newLeadActivityData.presalesUserId = null; // Clear presales assignment
        }
        
        // Set sub-status to hot
        const hotSubStatus = await Status.findOne({ slug: 'hot', type: 'leadSubStatus' });
        if (hotSubStatus) {
          console.log('Set sub-status to hot');
          newLeadActivityData.leadSubStatusId = hotSubStatus._id;
        }
      }
    }

    console.log('Creating new lead activity with data:', newLeadActivityData);

    // Create new lead activity
    const newLeadActivity = new LeadActivity(newLeadActivityData);
    await newLeadActivity.save();

    // Populate the response
    await newLeadActivity.populate([
      { path: 'leadId' },
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

    console.log('Lead activity created successfully');

    res.status(201).json({ 
      message: 'Lead updated successfully', 
      leadActivity: newLeadActivity 
    });
  } catch (error) {
    console.error('Error creating presales lead activity:', error);
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

// Create new lead activity entry
router.post('/:id/lead-activity', authenticateToken, documentUpload.array('files', 5), async (req, res) => {
  try {
    // Determine the actual Lead ID
    let actualLeadId = null;
    let existingLeadActivity = null;
    
    // Try to find as LeadActivity first
    try {
      existingLeadActivity = await LeadActivity.findById(req.params.id);
      if (existingLeadActivity) {
        actualLeadId = existingLeadActivity.leadId;
      }
    } catch (err) {
      // If not found as LeadActivity, try as Lead ID directly
      const lead = await Lead.findById(req.params.id);
      if (lead) {
        actualLeadId = lead._id;
        // Get the latest LeadActivity for this lead to copy data
        existingLeadActivity = await LeadActivity.findOne({ leadId: actualLeadId, deletedAt: null })
          .sort({ createdAt: -1 });
      }
    }

    if (!actualLeadId || !existingLeadActivity) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Prepare new lead activity data, copying from existing and updating with new data
    const newLeadActivityData = {
      leadId: actualLeadId,
      name: req.body.name || existingLeadActivity.name,
      email: req.body.email || existingLeadActivity.email,
      contactNumber: req.body.contactNumber || existingLeadActivity.contactNumber,
      sourceId: req.body.sourceId || existingLeadActivity.sourceId,
      updatedPerson: req.user.userId
    };

    // Add all other fields from request body or existing data
    const fieldsToUpdate = [
      'presalesUserId', 'salesUserId', 'leadStatusId', 'leadSubStatusId',
      'languageId', 'centreId', 'projectTypeId', 'projectValue', 'apartmentName',
      'houseTypeId', 'expectedPossessionDate', 'leadValue', 'paymentMethod',
      'siteVisit', 'siteVisitDate', 'centerVisit', 'centerVisitDate',
      'virtualMeeting', 'virtualMeetingDate',
      'notes', 'comment'
    ];

    fieldsToUpdate.forEach(field => {
      if (req.body[field] !== undefined) {
        newLeadActivityData[field] = req.body[field] || null;
      } else {
        newLeadActivityData[field] = existingLeadActivity[field];
      }
    });

    // Handle file uploads
    if (req.files && req.files.length > 0) {
      newLeadActivityData.files = req.files.map(file => ({
        filename: file.filename,
        originalname: file.originalname,
        size: file.size,
        mimetype: file.mimetype
      }));
    }

    // Check if lead status changed to qualified and assign to sales team
    if (req.body.leadStatusId) {
      const leadStatus = await Status.findById(req.body.leadStatusId);
      if (leadStatus && leadStatus.slug === 'qualified') {
        // Assign to sales agent using round robin
        const salesAgent = await getNextSalesAgent(newLeadActivityData.centreId, newLeadActivityData.languageId);
        if (salesAgent) {
          newLeadActivityData.salesUserId = salesAgent._id;
          // Clear presales assignment when moving to sales
          newLeadActivityData.presalesUserId = null;
        }
        
        // Set default sub-status for qualified leads
        if (!req.body.leadSubStatusId) {
          const hotSubStatus = await Status.findOne({ slug: 'hot', type: 'leadSubStatus' });
          if (hotSubStatus) {
            newLeadActivityData.leadSubStatusId = hotSubStatus._id;
          }
        }
      }
    }

    // Create new lead activity
    const newLeadActivity = new LeadActivity(newLeadActivityData);
    await newLeadActivity.save();

    // Populate the response
    await newLeadActivity.populate([
      { path: 'leadId' },
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

    res.status(201).json({ 
      message: 'Lead activity created successfully', 
      leadActivity: newLeadActivity 
    });
  } catch (error) {
    console.error('Error creating lead activity:', error);
    res.status(500).json({ error: 'Failed to create lead activity' });
  }
});

// Update lead
router.put('/:id', async (req, res) => {
  try {
    const leadActivity = await LeadActivity.findById(req.params.id);
    if (!leadActivity) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Update fields
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined && req.body[key] !== '') {
        leadActivity[key] = req.body[key];
      }
    });

    await leadActivity.save();
    
    // Populate the response
    await leadActivity.populate([
      { path: 'leadId' },
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

    res.json({ message: 'Lead updated successfully', lead: leadActivity });
  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

// Delete lead
router.delete('/:id', async (req, res) => {
  try {
    const leadActivity = await LeadActivity.findById(req.params.id);
    if (!leadActivity) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Soft delete
    leadActivity.deletedAt = new Date();
    await leadActivity.save();

    res.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    console.error('Error deleting lead:', error);
    res.status(500).json({ error: 'Failed to delete lead' });
  }
});

// Change language and reassign lead
router.post('/:id/change-language', authenticateToken, async (req, res) => {
  try {
    const { languageId, presalesUserId } = req.body;
    
    if (!languageId || !presalesUserId) {
      return res.status(400).json({ error: 'Language ID and Presales User ID are required' });
    }

    // Find existing lead activity
    let existingLeadActivity = null;
    let actualLeadId = null;
    
    try {
      existingLeadActivity = await LeadActivity.findById(req.params.id);
      if (existingLeadActivity) {
        actualLeadId = existingLeadActivity.leadId;
      }
    } catch (err) {
      const lead = await Lead.findById(req.params.id);
      if (lead) {
        actualLeadId = lead._id;
        existingLeadActivity = await LeadActivity.findOne({ leadId: actualLeadId, deletedAt: null })
          .sort({ createdAt: -1 });
      }
    }

    if (!actualLeadId || !existingLeadActivity) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Create new lead activity with language change
    const newLeadActivityData = {
      ...existingLeadActivity.toObject(),
      _id: undefined,
      languageId,
      presalesUserId,
      comment: 'Language changed and lead reassigned',
      updatedPerson: req.user.userId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const newLeadActivity = new LeadActivity(newLeadActivityData);
    await newLeadActivity.save();

    await newLeadActivity.populate([
      { path: 'leadId' },
      { path: 'presalesUserId', select: 'name email' },
      { path: 'salesUserId', select: 'name email' },
      { path: 'languageId', select: 'name' },
      { path: 'sourceId', select: 'name' },
      { path: 'centreId', select: 'name' },
      { path: 'leadStatusId', select: 'name slug' },
      { path: 'leadSubStatusId', select: 'name slug' }
    ]);

    res.status(201).json({ 
      message: 'Language changed and lead reassigned successfully', 
      leadActivity: newLeadActivity 
    });
  } catch (error) {
    console.error('Error changing language:', error);
    res.status(500).json({ error: 'Failed to change language' });
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