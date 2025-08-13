const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Status = require('./models/Status');

const testUserStatus = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find admin user
    const adminUser = await User.findOne({ email: 'admin@lms.com' })
      .populate('statusId')
      .populate('roleId');
    
    if (!adminUser) {
      console.log('Admin user not found. Please run seed script first.');
      return;
    }

    console.log('Admin User Status:', {
      name: adminUser.name,
      email: adminUser.email,
      status: adminUser.statusId.slug,
      role: adminUser.roleId.slug,
      isActive: adminUser.statusId.slug === 'active'
    });

    // Test deactivating user
    const inactiveStatus = await Status.findOne({ slug: 'inactive', type: 'status' });
    if (inactiveStatus) {
      console.log('\nDeactivating user...');
      adminUser.statusId = inactiveStatus._id;
      await adminUser.save();
      
      const updatedUser = await User.findById(adminUser._id).populate('statusId');
      console.log('Updated Status:', updatedUser.statusId.slug);
      
      // Reactivate user
      const activeStatus = await Status.findOne({ slug: 'active', type: 'status' });
      adminUser.statusId = activeStatus._id;
      await adminUser.save();
      console.log('User reactivated');
    }

    console.log('User status test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error testing user status:', error);
    process.exit(1);
  }
};

testUserStatus();