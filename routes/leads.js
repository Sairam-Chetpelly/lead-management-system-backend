const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const Lead = require('../models/Lead');
const LeadSource = require('../models/LeadSource');
const Status = require('../models/Status');
const Language = require('../models/Language');
const Centre = require('../models/Centre');
const { authenticateToken } = require('../middleware/auth');

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
        file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// POST bulk upload leads
router.post('/bulk-upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Parse Excel file
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      return res.status(400).json({ message: 'Excel file is empty' });
    }

    // Get reference data
    const [sources, statuses, languages, centres] = await Promise.all([
      LeadSource.find({ deletedAt: null }),
      Status.find({ type: 'leadStatus', deletedAt: null }),
      Language.find({ deletedAt: null }),
      Centre.find({ deletedAt: null })
    ]);

    const results = {
      success: [],
      errors: []
    };

    // Process each row
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 2; // Excel row number (accounting for header)

      try {
        // Validate required fields
        if (!row.Name || !row.Email || !row.ContactNumber || !row.Language) {
          results.errors.push({
            row: rowNumber,
            error: 'Missing required fields: Name, Email, ContactNumber, Language'
          });
          continue;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(row.Email)) {
          results.errors.push({
            row: rowNumber,
            error: 'Invalid email format'
          });
          continue;
        }

        // Validate contact number (should be 10 digits)
        const contactStr = row.ContactNumber.toString().replace(/\D/g, '');
        if (contactStr.length !== 10) {
          results.errors.push({
            row: rowNumber,
            error: 'Contact number must be exactly 10 digits'
          });
          continue;
        }

        // Find reference IDs
        const source = sources.find(s => s.name.toLowerCase() === (row.Source || 'manual').toLowerCase()) || 
                      sources.find(s => s.name.toLowerCase() === 'manual');
        
        const status = statuses.find(s => s.name.toLowerCase() === (row.Status || 'lead').toLowerCase()) || 
                      statuses.find(s => s.name.toLowerCase() === 'lead');
        
        const language = languages.find(l => l.name.toLowerCase() === row.Language.toLowerCase());
        
        const centre = row.Centre ? centres.find(c => c.name.toLowerCase() === row.Centre.toLowerCase()) : null;

        if (!language) {
          results.errors.push({
            row: rowNumber,
            error: `Language '${row.Language}' not found`
          });
          continue;
        }

        // Check for duplicate email or contact number
        const existingLead = await Lead.findOne({
          $or: [
            { email: row.Email },
            { contactNumber: row.ContactNumber }
          ],
          deletedAt: null
        });

        if (existingLead) {
          results.errors.push({
            row: rowNumber,
            error: `Lead with email '${row.Email}' or contact '${row.ContactNumber}' already exists`
          });
          continue;
        }

        // Create lead data
        const leadData = {
          name: row.Name.trim(),
          email: row.Email.trim().toLowerCase(),
          contactNumber: contactStr,
          sourceId: source._id,
          leadStatusId: status._id,
          languageId: language._id,
          centerId: centre ? centre._id : null
        };

        // Create and save lead
        const lead = new Lead(leadData);
        await lead.save();
        
        results.success.push({
          row: rowNumber,
          name: row.Name,
          leadId: lead.leadId
        });

      } catch (error) {
        results.errors.push({
          row: rowNumber,
          error: error.message
        });
      }
    }

    res.json({
      message: `Bulk upload completed. ${results.success.length} leads created, ${results.errors.length} errors.`,
      results
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET sample Excel template
router.get('/bulk-upload/template', authenticateToken, async (req, res) => {
  try {
    // Create sample data
    const sampleData = [
      {
        Name: 'John Doe',
        Email: 'john.doe@example.com',
        ContactNumber: '9876543210',
        Language: 'English',
        Source: 'Manual',
        Status: 'Lead',
        Centre: 'Mumbai Center'
      },
      {
        Name: 'Jane Smith',
        Email: 'jane.smith@example.com',
        ContactNumber: '9876543211',
        Language: 'Hindi',
        Source: 'Website',
        Status: 'Lead',
        Centre: 'Delhi Center'
      }
    ];

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sampleData);
    
    // Add instructions sheet
    const instructions = [
      { Field: 'Name', Required: 'Yes', Description: 'Full name of the lead' },
      { Field: 'Email', Required: 'Yes', Description: 'Valid email address' },
      { Field: 'ContactNumber', Required: 'Yes', Description: 'Phone number (10 digits)' },
      { Field: 'Language', Required: 'Yes', Description: 'Language preference (must exist in system)' },
      { Field: 'Source', Required: 'No', Description: 'Lead source (defaults to Manual)' },
      { Field: 'Status', Required: 'No', Description: 'Lead status (defaults to Lead)' },
      { Field: 'Centre', Required: 'No', Description: 'Center name (optional)' }
    ];
    
    const instructionsWs = XLSX.utils.json_to_sheet(instructions);
    
    XLSX.utils.book_append_sheet(wb, ws, 'Sample Data');
    XLSX.utils.book_append_sheet(wb, instructionsWs, 'Instructions');
    
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=leads_template.xlsx');
    res.send(buffer);
    
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET all leads
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', source = '', status = '' } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build filter query
    const filter = {};
    
    // Role-based filtering
    const Status = require('../models/Status');
    const [leadStatus, qualifiedStatus, lostStatus] = await Promise.all([
      Status.findOne({ slug: 'lead', type: 'leadStatus' }),
      Status.findOne({ slug: 'qualified', type: 'leadStatus' }),
      Status.findOne({ slug: 'lost', type: 'leadStatus' })
    ]);
    
    if (req.user.role === 'presales_agent') {
      // Presales agents see leads assigned to them that are not lost and not qualified
      filter.presalesUserId = req.user.userId;
      filter.leadStatusId = { $nin: [qualifiedStatus._id, lostStatus._id] };
    } else if (req.user.role === 'sales_agent') {
      // Sales agents only see qualified leads assigned to them
      filter.salesUserId = req.user.userId;
      filter.leadStatusId = qualifiedStatus._id;
    } else if (req.user.role === 'manager_presales' || req.user.role === 'hod_presales') {
      // Presales managers see all leads with presales team
      filter.$or = [
        { leadStatusId: leadStatus._id },
        { presalesUserId: { $exists: true, $ne: null } }
      ];
    } else if (req.user.role === 'sales_manager') {
      // Sales managers see qualified leads in their center
      filter.leadStatusId = qualifiedStatus._id;
      if (req.user.fullUser.centreId) {
        filter.centerId = req.user.fullUser.centreId;
      }
    } else if (req.user.role === 'hod_sales') {
      // HOD Sales sees all qualified leads
      filter.leadStatusId = qualifiedStatus._id;
    }
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { contactNumber: { $regex: search, $options: 'i' } }
      ];
    }
    if (source) filter.sourceId = source;
    if (status && (req.user.role === 'admin' || req.user.role === 'manager_presales' || req.user.role === 'hod_presales')) {
      filter.leadStatusId = status;
    }

    const leads = await Lead.find(filter)
      .populate('sourceId', 'name')
      .populate('leadStatusId', 'name')
      .populate('presalesUserId', 'name')
      .populate('salesUserId', 'name')
      .populate('languageId', 'name')
      .populate('centerId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Lead.countDocuments(filter);
    const totalPages = Math.ceil(total / limitNum);

    res.json({
      data: leads,
      pagination: {
        current: pageNum,
        limit: limitNum,
        total,
        totalPages
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET lead by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate('sourceId', 'name')
      .populate('leadStatusId', 'name')
      .populate('presalesUserId', 'name')
      .populate('salesUserId', 'name')
      .populate('languageId', 'name')
      .populate('centerId', 'name');
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }
    res.json(lead);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET lead details with call logs and activities
router.get('/:id/details', authenticateToken, async (req, res) => {
  try {
    const CallLog = require('../models/CallLog');
    const LeadActivity = require('../models/LeadActivity');
    
    const [lead, callLogs, activities] = await Promise.all([
      Lead.findById(req.params.id)
        .populate('sourceId', 'name')
        .populate('leadStatusId', 'name')
        .populate('presalesUserId', 'name')
        .populate('salesUserId', 'name')
        .populate('languageId', 'name')
        .populate('centerId', 'name'),
      CallLog.find({ leadId: req.params.id, deletedAt: null })
        .populate('userId', 'name')
        .sort({ callDateTime: -1 }),
      LeadActivity.find({ leadId: req.params.id, deletedAt: null })
        .populate('updatedPerson', 'name')
        .populate('presalesUserId', 'name')
        .populate('salesUserId', 'name')
        .populate('leadStatusId', 'name')
        .populate('languageId', 'name')
        .populate('sourceId', 'name')
        .populate('centerId', 'name')
        .sort({ createdAt: -1 })
    ]);
    
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }
    
    res.json({
      lead,
      callLogs,
      activities
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST create new lead
router.post('/', authenticateToken, async (req, res) => {
  try {
    const leadData = { ...req.body };
    
    // Clean empty strings
    if (leadData.assignmentType === '') delete leadData.assignmentType;
    if (leadData.presalesUserId === '') delete leadData.presalesUserId;
    if (leadData.salesUserId === '') delete leadData.salesUserId;
    if (leadData.leadSubstatus === '') delete leadData.leadSubstatus;
    if (leadData.cifDateTime === '') delete leadData.cifDateTime;
    
    // Auto-assignment logic
    if (leadData.assignmentType === 'auto') {
      const User = require('../models/User');
      const Role = require('../models/Role');
      
      if (leadData.leadSubstatus === 'hot' || leadData.leadSubstatus === 'warm') {
        // Auto-assign sales user with sales_agent role (round-robin)
        const salesRole = await Role.findOne({ slug: 'sales_agent' });
        if (salesRole) {
          const salesUsers = await User.find({ 
            roleId: salesRole._id,
            statusId: { $exists: true }
          });
          if (salesUsers.length > 0) {
            const leadCount = await Lead.countDocuments();
            const userIndex = leadCount % salesUsers.length;
            leadData.salesUserId = salesUsers[userIndex]._id;
          }
        }
      } else {
        // Auto-assign presales user with presales_agent role (round-robin)
        const presalesRole = await Role.findOne({ slug: 'presales_agent' });
        if (presalesRole) {
          const presalesUsers = await User.find({ 
            roleId: presalesRole._id,
            statusId: { $exists: true }
          });
          if (presalesUsers.length > 0) {
            const leadCount = await Lead.countDocuments();
            const userIndex = leadCount % presalesUsers.length;
            leadData.presalesUserId = presalesUsers[userIndex]._id;
          }
        }
      }
    }
    
    const lead = new Lead(leadData);
    const savedLead = await lead.save();
    res.status(201).json(savedLead);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PUT update lead
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const leadData = { ...req.body };
    
    // Clean empty strings
    if (leadData.assignmentType === '') delete leadData.assignmentType;
    if (leadData.presalesUserId === '') delete leadData.presalesUserId;
    if (leadData.salesUserId === '') delete leadData.salesUserId;
    if (leadData.leadSubstatus === '') delete leadData.leadSubstatus;
    if (leadData.cifDateTime === '') delete leadData.cifDateTime;
    
    // Handle qualification workflow
    const Status = require('../models/Status');
    const qualifiedStatus = await Status.findOne({ slug: 'qualified', type: 'leadStatus' });
    
    // Check if this is a qualification update (from call log)
    if (leadData.leadValue && leadData.centerId && leadData.languageId) {
      // This is a qualification - update lead status to qualified
      leadData.leadStatusId = qualifiedStatus._id;
      leadData.leadSubstatus = 'hot';
      leadData.isQualified = true;
      
      // Auto-assign to sales agent when qualified
      const User = require('../models/User');
      const Role = require('../models/Role');
      
      const salesRole = await Role.findOne({ slug: 'sales_agent' });
      if (salesRole) {
        const salesUsers = await User.find({ 
          roleId: salesRole._id,
          'statusId': { $exists: true }
        }).populate('statusId');
        
        const activeSalesUsers = salesUsers.filter(user => user.statusId.slug === 'active');
        if (activeSalesUsers.length > 0) {
          const leadCount = await Lead.countDocuments({ salesUserId: { $exists: true } });
          const userIndex = leadCount % activeSalesUsers.length;
          leadData.salesUserId = activeSalesUsers[userIndex]._id;
          // Remove presales assignment when qualified
          leadData.presalesUserId = null;
        }
      }
    }
    
    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      leadData,
      { new: true, runValidators: true }
    );
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }
    res.json(lead);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE lead
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id);
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }
    res.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET export leads
router.get('/export', authenticateToken, async (req, res) => {
  try {
    const leads = await Lead.find({ deletedAt: null })
      .populate('sourceId', 'name')
      .populate('leadStatusId', 'name')
      .populate('presalesUserId', 'name')
      .populate('salesUserId', 'name')
      .populate('languageId', 'name')
      .populate('centerId', 'name')
      .sort({ createdAt: -1 });

    const exportData = leads.map(lead => ({
      'Lead ID': lead.leadId || '',
      'Name': lead.name,
      'Email': lead.email,
      'Contact Number': lead.contactNumber,
      'Source': lead.sourceId?.name || '',
      'Status': lead.leadStatusId?.name || '',
      'Language': lead.languageId?.name || '',
      'Center': lead.centerId?.name || '',
      'Presales User': lead.presalesUserId?.name || '',
      'Sales User': lead.salesUserId?.name || '',
      'Lead Substatus': lead.leadSubstatus || '',
      'Lead Value': lead.leadValue || '',
      'Is Qualified': lead.isQualified ? 'Yes' : 'No',
      'Created At': lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : '',
      'Next Call Date': lead.nextCallDateTime ? new Date(lead.nextCallDateTime).toLocaleDateString() : '',
      'CIF Date': lead.cifDateTime ? new Date(lead.cifDateTime).toLocaleDateString() : ''
    }));

    res.json(exportData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;