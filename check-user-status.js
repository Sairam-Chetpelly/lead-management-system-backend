const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');

const checkUserStatus = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all users and their status
    const users = await User.find({ deletedAt: null })
      .populate('statusId')
      .populate('roleId')
      .select('name email statusId roleId');
    
    console.log('\n=== User Status Report ===');
    users.forEach(user => {
      console.log(`${user.name} (${user.email}): ${user.statusId?.slug || 'NO STATUS'} - ${user.roleId?.slug || 'NO ROLE'}`);
    });

    console.log('\n=== Checking for users without status ===');
    const usersWithoutStatus = await User.find({ 
      deletedAt: null, 
      statusId: { $exists: false } 
    });
    
    if (usersWithoutStatus.length > 0) {
      console.log('Users without status found:', usersWithoutStatus.length);
    } else {
      console.log('All users have status assigned');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error checking user status:', error);
    process.exit(1);
  }
};

checkUserStatus();