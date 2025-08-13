const mongoose = require('mongoose');
require('dotenv').config();

const Lead = require('./models/Lead');
const LeadSource = require('./models/LeadSource');
const Status = require('./models/Status');
const Language = require('./models/Language');
const Centre = require('./models/Centre');
const User = require('./models/User');

const createSalesTestLeads = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get required references
    const [manualSource, qualifiedStatus, englishLang, centre, salesAgent] = await Promise.all([
      LeadSource.findOne({ slug: 'manual' }),
      Status.findOne({ slug: 'qualified', type: 'leadStatus' }),
      Language.findOne({ code: 'en' }),
      Centre.findOne({ slug: 'mumbai' }),
      User.findOne({ email: 'sales@lms.com' })
    ]);

    if (!manualSource || !qualifiedStatus || !englishLang || !centre || !salesAgent) {
      console.error('Missing required data. Please run seed script first.');
      return;
    }

    // Create qualified test leads for sales agent
    const testLeads = [
      {
        name: 'Alice Johnson',
        email: 'alice.johnson@example.com',
        contactNumber: '+91-9876543220',
        sourceId: manualSource._id,
        leadStatusId: qualifiedStatus._id,
        languageId: englishLang._id,
        centerId: centre._id,
        salesUserId: salesAgent._id,
        leadSubstatus: 'hot',
        leadValue: 'high_value',
        isQualified: true
      },
      {
        name: 'Bob Wilson',
        email: 'bob.wilson@example.com',
        contactNumber: '+91-9876543221',
        sourceId: manualSource._id,
        leadStatusId: qualifiedStatus._id,
        languageId: englishLang._id,
        centerId: centre._id,
        salesUserId: salesAgent._id,
        leadSubstatus: 'warm',
        leadValue: 'low_value',
        isQualified: true,
        nextCallDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow
      },
      {
        name: 'Carol Davis',
        email: 'carol.davis@example.com',
        contactNumber: '+91-9876543222',
        sourceId: manualSource._id,
        leadStatusId: qualifiedStatus._id,
        languageId: englishLang._id,
        centerId: centre._id,
        salesUserId: salesAgent._id,
        leadSubstatus: 'cif',
        leadValue: 'high_value',
        isQualified: true,
        cifDateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Next week
      }
    ];

    // Clear existing test leads
    await Lead.deleteMany({ email: { $in: testLeads.map(l => l.email) } });

    // Create new test leads
    const createdLeads = [];
    for (const leadData of testLeads) {
      const lead = new Lead(leadData);
      const savedLead = await lead.save();
      createdLeads.push(savedLead);
    }

    console.log(`Created ${createdLeads.length} qualified test leads for sales agent`);

    createdLeads.forEach(lead => {
      console.log(`- ${lead.name} (${lead.leadId}) - ${lead.leadSubstatus} - ${lead.contactNumber}`);
    });

    console.log('Sales test leads created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error creating sales test leads:', error);
    process.exit(1);
  }
};

createSalesTestLeads();