const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const Role = require('./models/Role');
const Status = require('./models/Status');
const Centre = require('./models/Centre');
const Language = require('./models/Language');
const LeadSource = require('./models/LeadSource');
const ProjectAndHouseType = require('./models/ProjectAndHouseType');
const User = require('./models/User');

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await Promise.all([
      Role.deleteMany({}),
      Status.deleteMany({}),
      Centre.deleteMany({}),
      Language.deleteMany({}),
      LeadSource.deleteMany({}),
      ProjectAndHouseType.deleteMany({}),
      User.deleteMany({})
    ]);
    console.log('Cleared existing data');

    // Seed Roles
     const roles = [
      { name: 'Admin', slug: 'admin' },
      { name: 'HOD Presales', slug: 'hod_presales' },
      { name: 'Manager Presales', slug: 'manager_presales' },
      { name: 'Presales Agent', slug: 'presales_agent' },
      { name: 'HOD Sales', slug: 'hod_sales' },
      { name: 'Sales Manager', slug: 'sales_manager' },
      { name: 'Sales Agent', slug: 'sales_agent' }
    ];
    const savedRoles = await Role.insertMany(roles);
    console.log('Roles seeded');

    // Seed Statuses
    const statuses = [
      { type: 'status', name: 'Active', slug: 'active', description: 'Active status' },
      { type: 'status', name: 'Inactive', slug: 'inactive', description: 'Inactive status' },
      { type: 'status', name: 'Pending', slug: 'pending', description: 'Pending status' },
      { type: 'status', name: 'Suspended', slug: 'suspended', description: 'Suspended status' },
      { type: 'status', name: 'On Leave', slug: 'on_leave', description: 'On Leave status' },
      { type: 'status', name: 'Terminated', slug: 'terminated', description: 'Terminated status' },
      { type: 'leadStatus', name: 'Lead', slug: 'lead', description: 'New lead status' },
      { type: 'leadStatus', name: 'Qualified', slug: 'qualified', description: 'Qualified lead' },
      { type: 'leadStatus', name: 'Won', slug: 'won', description: 'Won Lead' },
      { type: 'leadStatus', name: 'Lost', slug: 'lost', description: 'Lost lead' },
      { type: 'leadSubStatus', name: 'Hot', slug: 'hot', description: 'Customer is most likely to get converted' }
      { type: 'leadSubStatus', name: 'Warm', slug: 'warm', description: 'Customer is likely to get converted' }
      { type: 'leadSubStatus', name: 'Call in Future', slug: 'cif', description: 'Call In Future - Customer may get interested in future' }
    ];
    const savedStatuses = await Status.insertMany(statuses);
    console.log('Statuses seeded');

    // Seed Centres
    const centres = [
      { name: 'Main Centre', slug: 'main' },
      { name: 'Delhi Branch', slug: 'delhi' },
      { name: 'Mumbai Branch', slug: 'mumbai' },
      { name: 'Bangalore Branch', slug: 'bangalore' },
      { name: 'Chennai Branch', slug: 'chennai' },
      { name: 'Hyderabad Branch', slug: 'hyderabad' },
      { name: 'Pune Branch', slug: 'pune' },
      { name: 'Kolkata Branch', slug: 'kolkata' }
    ];
    const savedCentres = await Centre.insertMany(centres);
    console.log('Centres seeded');

    // Seed Languages
    const languages = [
      { name: 'English', slug: 'english', code: 'en' },
      { name: 'Hindi', slug: 'hindi', code: 'hi' },
      { name: 'Tamil', slug: 'tamil', code: 'ta' },
      { name: 'Telugu', slug: 'telugu', code: 'te' },
      { name: 'Kannada', slug: 'kannada', code: 'kn' }
    ];
    const savedLanguages = await Language.insertMany(languages);
    console.log('Languages seeded');

    // Seed Lead Sources
    const leadSources = [
      { name: 'Website', slug: 'website', description: 'Leads from company website', isApiSource: false },
      { name: 'Facebook', slug: 'facebook', description: 'Leads from Facebook ads', isApiSource: true },
      { name: 'Google Ads', slug: 'google-ads', description: 'Leads from Google advertising', isApiSource: true },
      { name: 'Referral', slug: 'referral', description: 'Leads from customer referrals', isApiSource: false },
      { name: 'Walk-in', slug: 'walk-in', description: 'Walk-in customers', isApiSource: false }
    ];
    const savedLeadSources = await LeadSource.insertMany(leadSources);
    console.log('Lead sources seeded');

    // Seed Project and House Types
    const projectHouseTypes = [
      { name: 'Apartment', type: 'project', description: 'Multi-story residential building' },
      { name: 'Villa', type: 'project', description: 'Independent house with garden' },
      { name: 'Townhouse', type: 'project', description: 'Multi-level house sharing walls' },
      { name: '1BHK', type: 'house', description: '1 Bedroom, Hall, Kitchen' },
      { name: '2BHK', type: 'house', description: '2 Bedroom, Hall, Kitchen' },
      { name: '3BHK', type: 'house', description: '3 Bedroom, Hall, Kitchen' },
      { name: '4BHK', type: 'house', description: '4 Bedroom, Hall, Kitchen' }
    ];
    const savedProjectHouseTypes = await ProjectAndHouseType.insertMany(projectHouseTypes);
    console.log('Project and house types seeded');

    // Seed Admin User
    const adminRole = savedRoles.find(role => role.slug === 'administrator');
    const activeStatus = savedStatuses.find(status => status.slug === 'active' && status.type === 'status');
    const mumbaiCentre = savedCentres.find(centre => centre.slug === 'mumbai-centre');
    const englishLanguage = savedLanguages.find(lang => lang.code === 'en');

    const hashedPassword = await bcrypt.hash('admin123', 10);
    const adminUser = new User({
      name: 'System Administrator',
      email: 'admin@lms.com',
      password: hashedPassword,
      mobileNumber: '+91-9999999999',
      designation: 'System Administrator',
      roleId: adminRole._id,
      statusId: activeStatus._id,
      centreId: mumbaiCentre._id,
      languageIds: [englishLanguage._id],
      qualification: 'high_value'
    });
    await adminUser.save();
    console.log('Admin user created');

    console.log('All data seeded successfully!');
    console.log('Admin login: admin@lms.com / admin123');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();