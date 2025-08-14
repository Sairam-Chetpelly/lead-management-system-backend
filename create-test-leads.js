const mongoose = require('mongoose');
require('dotenv').config();

const Lead = require('./models/Lead');
const LeadSource = require('./models/LeadSource');
const Status = require('./models/Status');
const Language = require('./models/Language');
const Centre = require('./models/Centre');
const User = require('./models/User');

const createTestLeads = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get required references
    const [manualSource, leadStatus, englishLang, centre, presalesAgent] = await Promise.all([
      LeadSource.findOne({ slug: 'manual' }),
      Status.findOne({ slug: 'lead', type: 'leadStatus' }),
      Language.findOne({ code: 'en' }),
      Centre.findOne({ slug: 'mumbai' }),
      User.findOne({ email: 'presales@lms.com' })
    ]);

    if (!manualSource || !leadStatus || !englishLang || !centre || !presalesAgent) {
      console.error('Missing required data. Please run seed script first.');
      return;
    }

    // Create test leads
    const testLeads = [
      {
        name: 'John Doe',
        email: 'john.doe@example.com',
        contactNumber: '+91-9876543210',
        sourceId: manualSource._id,
        leadStatusId: leadStatus._id,
        languageId: englishLang._id,
        centerId: centre._id,
        presalesUserId: presalesAgent._id
      },
      {
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        contactNumber: '+91-9876543211',
        sourceId: manualSource._id,
        leadStatusId: leadStatus._id,
        languageId: englishLang._id,
        centerId: centre._id,
        presalesUserId: presalesAgent._id
      },
      {
        name: 'Bob Johnson',
        email: 'bob.johnson@example.com',
        contactNumber: '+91-9876543212',
        sourceId: manualSource._id,
        leadStatusId: leadStatus._id,
        languageId: englishLang._id,
        centerId: centre._id,
        presalesUserId: presalesAgent._id
      }
    ];

    // Clear existing test leads
    await Lead.deleteMany({ email: { $in: testLeads.map(l => l.email) } });

    // Create new test leads one by one to trigger pre-save hooks
    const createdLeads = [];
    for (const leadData of testLeads) {
      const lead = new Lead(leadData);
      const savedLead = await lead.save();
      createdLeads.push(savedLead);
    }
    console.log(`Created ${createdLeads.length} test leads`);

    createdLeads.forEach(lead => {
      console.log(`- ${lead.name} (${lead.leadId}) - ${lead.contactNumber}`);
    });

    console.log('Test leads created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error creating test leads:', error);
    process.exit(1);
  }
};

createTestLeads();