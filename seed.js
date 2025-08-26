const mongoose = require('mongoose');
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

    // Roles
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

    // Statuses
    const statuses = [
      { type: 'status', name: 'Active', slug: 'active', description: 'Active status' },
      { type: 'status', name: 'Inactive', slug: 'inactive', description: 'Inactive status' },
      { type: 'leadStatus', name: 'Lead', slug: 'lead', description: 'New lead status' },
      { type: 'leadStatus', name: 'Qualified', slug: 'qualified', description: 'Qualified lead' },
      { type: 'leadStatus', name: 'Won', slug: 'won', description: 'Won Lead' },
      { type: 'leadStatus', name: 'Lost', slug: 'lost', description: 'Lost lead' },
      { type: 'leadSubStatus', name: 'Hot', slug: 'hot', description: 'Customer is most likely to get converted' },
      { type: 'leadSubStatus', name: 'Warm', slug: 'warm', description: 'Customer is likely to get converted' },
      { type: 'leadSubStatus', name: 'Call in Future', slug: 'cif', description: 'Call In Future - Customer may get interested in future' },
      { type: 'leadSubStatus', name: 'Interested', slug: 'interested', description: 'Customer is interested in the product/service' },
      { type: 'leadSubStatus', name: 'Meeting Arranged', slug: 'meeting-arranged', description: 'Meeting has been scheduled with the customer' }
    ];
    const savedStatuses = await Status.insertMany(statuses);
    console.log('Statuses seeded');

    // Centres
    const centres = [
      { name: 'Main Centre', slug: 'main' },
      { name: 'Delhi Branch', slug: 'delhi' },
      { name: 'Mumbai Branch', slug: 'mumbai' },
      { name: 'Bangalore Branch', slug: 'bangalore' }
    ];
    const savedCentres = await Centre.insertMany(centres);
    console.log('Centres seeded');

    // Languages
    const languages = [
      { name: 'English', slug: 'english', code: 'en' },
      { name: 'Hindi', slug: 'hindi', code: 'hi' },
      { name: 'Assamese', slug: 'assamese', code: 'as' },
      { name: 'Bengali', slug: 'bengali', code: 'bn' },
      { name: 'Bodo', slug: 'bodo', code: 'brx' },
      { name: 'Dogri', slug: 'dogri', code: 'doi' },
      { name: 'Gujarati', slug: 'gujarati', code: 'gu' },
      { name: 'Kannada', slug: 'kannada', code: 'kn' },
      { name: 'Kashmiri', slug: 'kashmiri', code: 'ks' },
      { name: 'Konkani', slug: 'konkani', code: 'kok' },
      { name: 'Maithili', slug: 'maithili', code: 'mai' },
      { name: 'Malayalam', slug: 'malayalam', code: 'ml' },
      { name: 'Manipuri (Meitei)', slug: 'manipuri', code: 'mni' },
      { name: 'Marathi', slug: 'marathi', code: 'mr' },
      { name: 'Nepali', slug: 'nepali', code: 'ne' },
      { name: 'Odia', slug: 'odia', code: 'or' },
      { name: 'Punjabi', slug: 'punjabi', code: 'pa' },
      { name: 'Sanskrit', slug: 'sanskrit', code: 'sa' },
      { name: 'Santali', slug: 'santali', code: 'sat' },
      { name: 'Sindhi', slug: 'sindhi', code: 'sd' },
      { name: 'Tamil', slug: 'tamil', code: 'ta' },
      { name: 'Telugu', slug: 'telugu', code: 'te' },
      { name: 'Urdu', slug: 'urdu', code: 'ur' }
    ];
    const savedLanguages = await Language.insertMany(languages);
    console.log('Languages seeded');

    // Lead Sources
    const leadSources = [
      { name: 'Facebook', slug: 'facebook', description: 'Leads from Facebook ads', isApiSource: true },
      { name: 'Instagram', slug: 'instagram', description: 'Leads from Instagram ads', isApiSource: true },
      { name: 'Instagram Boost', slug: 'instagram-boost', description: 'Leads from Instagram boost posts', isApiSource: false },
      { name: 'Instagram DM', slug: 'instagram-dm', description: 'Leads from Instagram direct messages', isApiSource: false },
      { name: 'Google', slug: 'google', description: 'Leads from Google advertising', isApiSource: true },
      { name: 'Referral', slug: 'referral', description: 'Leads from customer referrals', isApiSource: false },
      { name: 'CP', slug: 'cp', description: 'Manually entered leads', isApiSource: false },
      { name: 'Walk-in', slug: 'walk-in', description: 'Leads from in-person visits', isApiSource: false },
      { name: 'Organic', slug: 'organic', description: 'Leads from company website or forms', isApiSource: false },
      { name: 'Just Dial', slug: 'just-dial', description: 'Leads from Just Dial service', isApiSource: false },
      { name: 'Quikr', slug: 'quikr', description: 'Leads from Quikr campaigns', isApiSource: true },
      { name: 'Bark', slug: 'bark', description: 'Leads from events, trade shows, or webinars', isApiSource: false }
    ];
    const savedLeadSources = await LeadSource.insertMany(leadSources);
    console.log('Lead sources seeded');

    // Project & House Types
    const projectHouseTypes = [
      { name: 'New Project', type: 'project', description: 'Brand new residential or commercial construction' },
      { name: 'Under Construction', type: 'project', description: 'Ongoing project that is not yet completed' },
      { name: 'Ready to Move', type: 'project', description: 'Completed project with immediate possession' },
      { name: 'Renovation', type: 'project', description: 'Upgrading or remodeling an existing property' },
      { name: 'Redevelopment', type: 'project', description: 'Rebuilding old structures into new modern projects' },
      { name: 'Apartment', type: 'project', description: 'Multi-story residential building' },
      { name: 'Villa', type: 'project', description: 'Independent house with garden' },
      { name: 'Townhouse', type: 'project', description: 'Multi-level house sharing walls' },
      { name: '1RK', type: 'house', description: '1 Room and Kitchen, compact unit' },
      { name: '1BHK', type: 'house', description: '1 Bedroom, Hall, and Kitchen' },
      { name: '2BHK', type: 'house', description: '2 Bedrooms, Hall, and Kitchen' },
      { name: '2.5BHK', type: 'house', description: '2 Bedrooms + small study/extra room, Hall, and Kitchen' },
      { name: '3BHK', type: 'house', description: '3 Bedrooms, Hall, and Kitchen' },
      { name: '3.5BHK', type: 'house', description: '3 Bedrooms + study/extra room, Hall, and Kitchen' },
      { name: '4BHK', type: 'house', description: '4 Bedrooms, Hall, and Kitchen' },
      { name: '4.5BHK', type: 'house', description: '4 Bedrooms + extra room, Hall, and Kitchen' },
      { name: '5BHK', type: 'house', description: '5 Bedrooms, Hall, and Kitchen' },
      { name: '6BHK+', type: 'house', description: 'Luxury homes with 6 or more bedrooms' },
      { name: 'Studio', type: 'house', description: 'Single open room with kitchen and bath' },
      { name: 'Penthouse Unit', type: 'house', description: 'Luxury top-floor unit with terrace' },
      { name: 'Duplex Unit', type: 'house', description: 'Two-level house unit' },
      { name: 'Triplex Unit', type: 'house', description: 'Three-level house unit' }
    ];
    const savedProjectHouseTypes = await ProjectAndHouseType.insertMany(projectHouseTypes);
    console.log('Project and house types seeded');

    // Admin user
    const adminRole = savedRoles.find(role => role.slug === 'admin');
    const activeStatus = savedStatuses.find(status => status.slug === 'active' && status.type === 'status');
    const mainCentre = savedCentres.find(centre => centre.slug === 'main');
    const englishLanguage = savedLanguages.find(lang => lang.code === 'en');

    const adminUser = new User({
      name: 'System Administrator',
      email: 'admin@lms.com',
      password: 'admin123',
      mobileNumber: '+91-9999999999',
      designation: 'System Administrator',
      roleId: adminRole._id,
      statusId: activeStatus._id,
      centreId: mainCentre._id,
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
