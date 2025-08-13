const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Role = require('./models/Role');
const Status = require('./models/Status');
const Centre = require('./models/Centre');
const Language = require('./models/Language');

const createTestUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get required references
    const [presalesRole, salesRole, activeStatus, centre, language] = await Promise.all([
      Role.findOne({ slug: 'presales_agent' }),
      Role.findOne({ slug: 'sales_agent' }),
      Status.findOne({ slug: 'active', type: 'status' }),
      Centre.findOne({ slug: 'mumbai' }),
      Language.findOne({ code: 'en' })
    ]);

    // Create presales agent
    const presalesAgent = new User({
      name: 'John Presales',
      email: 'presales@lms.com',
      password: 'presales123',
      mobileNumber: '+91-9999999998',
      designation: 'Presales Agent',
      roleId: presalesRole._id,
      statusId: activeStatus._id,
      centreId: centre._id,
      languageIds: [language._id],
      qualification: 'high_value'
    });
    await presalesAgent.save();
    console.log('Presales agent created: presales@lms.com / presales123');

    // Create sales agent
    const salesAgent = new User({
      name: 'Jane Sales',
      email: 'sales@lms.com',
      password: 'sales123',
      mobileNumber: '+91-9999999997',
      designation: 'Sales Agent',
      roleId: salesRole._id,
      statusId: activeStatus._id,
      centreId: centre._id,
      languageIds: [language._id],
      qualification: 'high_value'
    });
    await salesAgent.save();
    console.log('Sales agent created: sales@lms.com / sales123');

    console.log('Test users created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error creating test users:', error);
    process.exit(1);
  }
};

createTestUsers();