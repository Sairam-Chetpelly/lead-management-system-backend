const mongoose = require('mongoose');
const Status = require('../models/Status');
const Role = require('../models/Role');

const workflowStatuses = [
  {
    type: 'leadStatus',
    name: 'New Lead',
    slug: 'new-lead',
    description: 'Newly created lead'
  },
  {
    type: 'leadStatus',
    name: 'Pre-Sales Assigned',
    slug: 'pre-sales-assigned',
    description: 'Lead assigned to pre-sales team'
  },
  {
    type: 'leadStatus',
    name: 'Language Evaluated',
    slug: 'language-evaluated',
    description: 'Language comfort evaluated'
  },
  {
    type: 'leadStatus',
    name: 'Qualified - Hot',
    slug: 'qualified-hot',
    description: 'Lead qualified and marked as hot'
  },
  {
    type: 'leadStatus',
    name: 'Sales Assigned',
    slug: 'sales-assigned',
    description: 'Lead assigned to sales team'
  },
  {
    type: 'leadStatus',
    name: 'Site Visit Scheduled',
    slug: 'site-visit-scheduled',
    description: 'Site visit has been scheduled'
  },
  {
    type: 'leadStatus',
    name: 'Centre Selected',
    slug: 'centre-selected',
    description: 'Lead selected for centre visit'
  },
  {
    type: 'leadStatus',
    name: 'Virtual Meeting Scheduled',
    slug: 'virtual-meeting-scheduled',
    description: 'Virtual meeting has been scheduled'
  },
  {
    type: 'leadStatus',
    name: 'Won',
    slug: 'won',
    description: 'Lead converted successfully'
  },
  {
    type: 'leadStatus',
    name: 'Lost',
    slug: 'lost',
    description: 'Lead marked as lost'
  },
  {
    type: 'leadStatus',
    name: 'Cold Call Future',
    slug: 'cold-call-future',
    description: 'Lead to be contacted in future'
  }
];

const workflowRoles = [
  {
    name: 'Pre-Sales Executive',
    slug: 'pre-sales-executive'
  },
  {
    name: 'Pre-Sales Manager',
    slug: 'pre-sales-manager'
  },
  {
    name: 'Sales Executive',
    slug: 'sales-executive'
  },
  {
    name: 'Sales Manager',
    slug: 'sales-manager'
  }
];

async function seedWorkflowData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lms');
    
    console.log('Seeding workflow statuses...');
    
    // Seed statuses
    for (const status of workflowStatuses) {
      await Status.findOneAndUpdate(
        { slug: status.slug, type: status.type },
        status,
        { upsert: true, new: true }
      );
    }
    
    console.log('Seeding workflow roles...');
    
    // Seed roles
    for (const role of workflowRoles) {
      await Role.findOneAndUpdate(
        { slug: role.slug },
        role,
        { upsert: true, new: true }
      );
    }
    
    console.log('Workflow data seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding workflow data:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  seedWorkflowData();
}

module.exports = { seedWorkflowData };