const express = require('express');
const router = express.Router();
const LeadWorkflowService = require('../services/leadWorkflowService');
const LeadSource = require('../models/LeadSource');
const Status = require('../models/Status');

// POST webhook for Facebook/Instagram leads
router.post('/facebook', async (req, res) => {
  try {
    const { name, email, phone, source = 'Facebook' } = req.body;
    
    // Get or create lead source
    let leadSource = await LeadSource.findOne({ name: source });
    if (!leadSource) {
      leadSource = new LeadSource({
        name: source,
        slug: source.toLowerCase(),
        description: `Leads from ${source}`
      });
      await leadSource.save();
    }
    
    // Get initial status
    const initialStatus = await Status.findOne({ slug: 'new-lead', type: 'leadStatus' });
    
    const leadData = {
      name,
      email,
      contactNumber: phone,
      sourceId: leadSource._id,
      leadStatusId: initialStatus._id
    };
    
    const lead = await LeadWorkflowService.createAndAssignLead(
      leadData,
      'api_integration',
      null // System created
    );
    
    res.status(201).json({ 
      success: true, 
      leadId: lead._id,
      message: 'Lead created and assigned successfully' 
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST webhook for LinkedIn leads
router.post('/linkedin', async (req, res) => {
  try {
    const { firstName, lastName, emailAddress, phoneNumber } = req.body;
    
    let leadSource = await LeadSource.findOne({ name: 'LinkedIn' });
    if (!leadSource) {
      leadSource = new LeadSource({
        name: 'LinkedIn',
        slug: 'linkedin',
        description: 'Leads from LinkedIn'
      });
      await leadSource.save();
    }
    
    const initialStatus = await Status.findOne({ slug: 'new-lead', type: 'leadStatus' });
    
    const leadData = {
      name: `${firstName} ${lastName}`,
      email: emailAddress,
      contactNumber: phoneNumber,
      sourceId: leadSource._id,
      leadStatusId: initialStatus._id
    };
    
    const lead = await LeadWorkflowService.createAndAssignLead(
      leadData,
      'api_integration',
      null
    );
    
    res.status(201).json({ 
      success: true, 
      leadId: lead._id,
      message: 'Lead created and assigned successfully' 
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST webhook for Google Ads leads
router.post('/google', async (req, res) => {
  try {
    const { name, email, phone_number, source = 'Google Ads' } = req.body;
    
    let leadSource = await LeadSource.findOne({ name: source });
    if (!leadSource) {
      leadSource = new LeadSource({
        name: source,
        slug: source.toLowerCase().replace(' ', '-'),
        description: `Leads from ${source}`
      });
      await leadSource.save();
    }
    
    const initialStatus = await Status.findOne({ slug: 'new-lead', type: 'leadStatus' });
    
    const leadData = {
      name,
      email,
      contactNumber: phone_number,
      sourceId: leadSource._id,
      leadStatusId: initialStatus._id
    };
    
    const lead = await LeadWorkflowService.createAndAssignLead(
      leadData,
      'api_integration',
      null
    );
    
    res.status(201).json({ 
      success: true, 
      leadId: lead._id,
      message: 'Lead created and assigned successfully' 
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Generic webhook for any platform
router.post('/webhook', async (req, res) => {
  try {
    const { 
      name, 
      email, 
      phone, 
      source = 'API Integration',
      ...additionalData 
    } = req.body;
    
    let leadSource = await LeadSource.findOne({ name: source });
    if (!leadSource) {
      leadSource = new LeadSource({
        name: source,
        slug: source.toLowerCase().replace(/\s+/g, '-'),
        description: `Leads from ${source}`
      });
      await leadSource.save();
    }
    
    const initialStatus = await Status.findOne({ slug: 'new-lead', type: 'leadStatus' });
    
    const leadData = {
      name,
      email,
      contactNumber: phone,
      sourceId: leadSource._id,
      leadStatusId: initialStatus._id,
      ...additionalData
    };
    
    const lead = await LeadWorkflowService.createAndAssignLead(
      leadData,
      'api_integration',
      null
    );
    
    res.status(201).json({ 
      success: true, 
      leadId: lead._id,
      message: 'Lead created and assigned successfully' 
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;