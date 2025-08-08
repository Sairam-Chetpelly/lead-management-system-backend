const mongoose = require('mongoose');
const LeadSource = require('../models/LeadSource');
const ProjectAndHouseType = require('../models/ProjectAndHouseType');
const Status = require('../models/Status');
require('dotenv').config();

const seedLeadData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await LeadSource.deleteMany({});
    await ProjectAndHouseType.deleteMany({});
    
    // Seed Lead Sources
    const leadSources = [
      {
        name: 'Website',
        slug: 'website',
        description: 'Leads from company website',
        isApiSource: false
      },
      {
        name: 'Facebook',
        slug: 'facebook',
        description: 'Leads from Facebook ads',
        isApiSource: true
      },
      {
        name: 'Google Ads',
        slug: 'google-ads',
        description: 'Leads from Google advertising',
        isApiSource: true
      },
      {
        name: 'Referral',
        slug: 'referral',
        description: 'Leads from customer referrals',
        isApiSource: false
      }
    ];

    await LeadSource.insertMany(leadSources);
    console.log('Lead sources seeded');

    // Seed Project and House Types
    const projectHouseTypes = [
      {
        name: 'Apartment',
        type: 'project',
        description: 'Multi-story residential building'
      },
      {
        name: 'Villa',
        type: 'project',
        description: 'Independent house with garden'
      },
      {
        name: '1BHK',
        type: 'house',
        description: '1 Bedroom, Hall, Kitchen'
      },
      {
        name: '2BHK',
        type: 'house',
        description: '2 Bedroom, Hall, Kitchen'
      },
      {
        name: '3BHK',
        type: 'house',
        description: '3 Bedroom, Hall, Kitchen'
      }
    ];

    await ProjectAndHouseType.insertMany(projectHouseTypes);
    console.log('Project and house types seeded');

    // Seed Lead Statuses
    const leadStatuses = [
      {
        type: 'leadStatus',
        name: 'New Lead',
        slug: 'new-lead',
        description: 'Newly generated lead'
      },
      {
        type: 'leadStatus',
        name: 'Contacted',
        slug: 'contacted',
        description: 'Lead has been contacted'
      },
      {
        type: 'leadStatus',
        name: 'Qualified',
        slug: 'qualified',
        description: 'Lead is qualified for further process'
      },
      {
        type: 'leadStatus',
        name: 'Converted',
        slug: 'converted',
        description: 'Lead has been converted to customer'
      },
      {
        type: 'leadSubStatus',
        name: 'Follow Up Required',
        slug: 'follow-up-required',
        description: 'Lead requires follow up'
      },
      {
        type: 'leadSubStatus',
        name: 'Not Interested',
        slug: 'not-interested',
        description: 'Lead is not interested'
      }
    ];

    await Status.insertMany(leadStatuses);
    console.log('Lead statuses seeded');

    console.log('All lead data seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedLeadData();