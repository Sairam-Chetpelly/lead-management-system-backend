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
    const statuses = [
      { type: 'status', name: 'Active', slug: 'active', description: 'Active status' },
      { type: 'status', name: 'Inactive', slug: 'inactive', description: 'Inactive status' },
      { type: 'leadStatus', name: 'Lead', slug: 'lead', description: 'New lead status' },
      { type: 'leadStatus', name: 'Qualified', slug: 'qualified', description: 'Qualified lead' },
      { type: 'leadStatus', name: 'Won', slug: 'won', description: 'Won Lead' },
      { type: 'leadStatus', name: 'Lost', slug: 'lost', description: 'Lost lead' },
      { type: 'leadSubStatus', name: 'Hot', slug: 'hot', description: 'Customer is most likely to get converted' },
      { type: 'leadSubStatus', name: 'Warm', slug: 'warm', description: 'Customer is likely to get converted' },
      { type: 'leadSubStatus', name: 'Call in Future', slug: 'cif', description: 'Call In Future - Customer may get interested in future' }
    ];
    const savedStatuses = await Status.insertMany(statuses);
    console.log('Statuses seeded');

    const centres = [
      { name: 'Main Centre', slug: 'main' },
      { name: 'Delhi Branch', slug: 'delhi' },
      { name: 'Mumbai Branch', slug: 'mumbai' },
      { name: 'Bangalore Branch', slug: 'bangalore' },
      { name: 'Chennai Branch', slug: 'chennai' },
      { name: 'Hyderabad Branch', slug: 'hyderabad' },
      { name: 'Pune Branch', slug: 'pune' },
      { name: 'Kolkata Branch', slug: 'kolkata' },
      { name: 'Ahmedabad Branch', slug: 'ahmedabad' },
      { name: 'Jaipur Branch', slug: 'jaipur' },
      { name: 'Lucknow Branch', slug: 'lucknow' },
      { name: 'Kanpur Branch', slug: 'kanpur' },
      { name: 'Nagpur Branch', slug: 'nagpur' },
      { name: 'Indore Branch', slug: 'indore' },
      { name: 'Patna Branch', slug: 'patna' },
      { name: 'Bhopal Branch', slug: 'bhopal' },
      { name: 'Surat Branch', slug: 'surat' },
      { name: 'Vadodara Branch', slug: 'vadodara' },
      { name: 'Rajkot Branch', slug: 'rajkot' },
      { name: 'Amritsar Branch', slug: 'amritsar' },
      { name: 'Ludhiana Branch', slug: 'ludhiana' },
      { name: 'Jalandhar Branch', slug: 'jalandhar' },
      { name: 'Chandigarh Branch', slug: 'chandigarh' },
      { name: 'Dehradun Branch', slug: 'dehradun' },
      { name: 'Meerut Branch', slug: 'meerut' },
      { name: 'Ghaziabad Branch', slug: 'ghaziabad' },
      { name: 'Noida Branch', slug: 'noida' },
      { name: 'Gurgaon Branch', slug: 'gurgaon' },
      { name: 'Faridabad Branch', slug: 'faridabad' },
      { name: 'Agra Branch', slug: 'agra' },
      { name: 'Varanasi Branch', slug: 'varanasi' },
      { name: 'Prayagraj Branch', slug: 'prayagraj' },
      { name: 'Ranchi Branch', slug: 'ranchi' },
      { name: 'Jamshedpur Branch', slug: 'jamshedpur' },
      { name: 'Bhubaneswar Branch', slug: 'bhubaneswar' },
      { name: 'Cuttack Branch', slug: 'cuttack' },
      { name: 'Raipur Branch', slug: 'raipur' },
      { name: 'Bilaspur Branch', slug: 'bilaspur' },
      { name: 'Durg Branch', slug: 'durg' },
      { name: 'Gwalior Branch', slug: 'gwalior' },
      { name: 'Ujjain Branch', slug: 'ujjain' },
      { name: 'Jodhpur Branch', slug: 'jodhpur' },
      { name: 'Udaipur Branch', slug: 'udaipur' },
      { name: 'Ajmer Branch', slug: 'ajmer' },
      { name: 'Kota Branch', slug: 'kota' },
      { name: 'Mysore Branch', slug: 'mysore' },
      { name: 'Mangalore Branch', slug: 'mangalore' },
      { name: 'Hubli Branch', slug: 'hubli' },
      { name: 'Belgaum Branch', slug: 'belgaum' },
      { name: 'Davangere Branch', slug: 'davangere' },
      { name: 'Coimbatore Branch', slug: 'coimbatore' },
      { name: 'Madurai Branch', slug: 'madurai' },
      { name: 'Tiruchirappalli Branch', slug: 'tiruchirappalli' },
      { name: 'Salem Branch', slug: 'salem' },
      { name: 'Erode Branch', slug: 'erode' },
      { name: 'Warangal Branch', slug: 'warangal' },
      { name: 'Nizamabad Branch', slug: 'nizamabad' },
      { name: 'Karimnagar Branch', slug: 'karimnagar' },
      { name: 'Khammam Branch', slug: 'khammam' },
      { name: 'Tirupati Branch', slug: 'tirupati' },
      { name: 'Vijayawada Branch', slug: 'vijayawada' },
      { name: 'Guntur Branch', slug: 'guntur' },
      { name: 'Nellore Branch', slug: 'nellore' },
      { name: 'Visakhapatnam Branch', slug: 'visakhapatnam' },
      { name: 'Rajahmundry Branch', slug: 'rajahmundry' },
      { name: 'Kakinada Branch', slug: 'kakinada' },
      { name: 'Shimla Branch', slug: 'shimla' },
      { name: 'Manali Branch', slug: 'manali' },
      { name: 'Leh Branch', slug: 'leh' },
      { name: 'Srinagar Branch', slug: 'srinagar' },
      { name: 'Jammu Branch', slug: 'jammu' },
      { name: 'Shillong Branch', slug: 'shillong' },
      { name: 'Guwahati Branch', slug: 'guwahati' },
      { name: 'Agartala Branch', slug: 'agartala' },
      { name: 'Imphal Branch', slug: 'imphal' },
      { name: 'Aizawl Branch', slug: 'aizawl' },
      { name: 'Gangtok Branch', slug: 'gangtok' },
      { name: 'Kohima Branch', slug: 'kohima' },
      { name: 'Itanagar Branch', slug: 'itanagar' },
      { name: 'Port Blair Branch', slug: 'portblair' },
      { name: 'Pondicherry Branch', slug: 'pondicherry' },
      { name: 'Panaji Branch', slug: 'panaji' },
      { name: 'Margao Branch', slug: 'margao' },
      { name: 'Siliguri Branch', slug: 'siliguri' },
      { name: 'Durgapur Branch', slug: 'durgapur' },
      { name: 'Asansol Branch', slug: 'asansol' },
      { name: 'Howrah Branch', slug: 'howrah' },
      { name: 'Dhanbad Branch', slug: 'dhanbad' },
      { name: 'Hazaribagh Branch', slug: 'hazaribagh' },
      { name: 'Aligarh Branch', slug: 'aligarh' },
      { name: 'Bareilly Branch', slug: 'bareilly' },
      { name: 'Moradabad Branch', slug: 'moradabad' },
      { name: 'Saharanpur Branch', slug: 'saharanpur' },
      { name: 'Roorkee Branch', slug: 'roorkee' },
      { name: 'Haridwar Branch', slug: 'haridwar' },
      { name: 'Rishikesh Branch', slug: 'rishikesh' },
      { name: 'Palakkad Branch', slug: 'palakkad' },
      { name: 'Thrissur Branch', slug: 'thrissur' },
      { name: 'Kozhikode Branch', slug: 'kozhikode' },
      { name: 'Alappuzha Branch', slug: 'alappuzha' },
      { name: 'Kollam Branch', slug: 'kollam' },
      { name: 'Thiruvananthapuram Branch', slug: 'thiruvananthapuram' }
    ];

    const savedCentres = await Centre.insertMany(centres);
    console.log('Centres seeded');

    // Seed Languages
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
    const leadSources = [
      { name: 'Manual', slug: 'manual', description: 'Manually entered leads', isApiSource: false },
      { name: 'Website', slug: 'website', description: 'Leads from company website or forms', isApiSource: false },
      { name: 'Referral', slug: 'referral', description: 'Leads from customer referrals', isApiSource: false },
      { name: 'Facebook', slug: 'facebook', description: 'Leads from Facebook ads', isApiSource: true },
      { name: 'Instagram', slug: 'instagram', description: 'Leads from Instagram ads', isApiSource: true },
      { name: 'Google Ads', slug: 'google-ads', description: 'Leads from Google advertising', isApiSource: true },
      { name: 'LinkedIn', slug: 'linkedin', description: 'Leads from LinkedIn campaigns', isApiSource: true },
      { name: 'Walk-in', slug: 'walk-in', description: 'Leads from in-person visits', isApiSource: false },
      { name: 'Events', slug: 'events', description: 'Leads from events, trade shows, or webinars', isApiSource: false },
      { name: 'Cold Call', slug: 'cold-call', description: 'Leads from outbound calling', isApiSource: false }
    ];
    const savedLeadSources = await LeadSource.insertMany(leadSources);
    console.log('Lead sources seeded');
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
    const adminRole = savedRoles.find(role => role.slug === 'admin');
    const activeStatus = savedStatuses.find(status => status.slug === 'active' && status.type === 'status');
    const mumbaiCentre = savedCentres.find(centre => centre.slug === 'mumbai');
    const englishLanguage = savedLanguages.find(lang => lang.code === 'en');
    const adminUser = new User({
      name: 'System Administrator',
      email: 'admin@lms.com',
      password: 'admin123',
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