const express = require('express');
const Role = require('../models/Role');
const Status = require('../models/Status');
const Centre = require('../models/Centre');
const User = require('../models/User');
const router = express.Router();

// Initialize default data
router.post('/init', async (req, res) => {
  try {
    // Create roles
    const roles = [
      { name: 'Admin', slug: 'admin' },
      { name: 'HOD Presales', slug: 'hod_presales' },
      { name: 'Manager Presales', slug: 'manager_presales' },
      { name: 'Presales Agent', slug: 'presales_agent' },
      { name: 'HOD Sales', slug: 'hod_sales' },
      { name: 'Sales Manager', slug: 'sales_manager' },
      { name: 'Sales Agent', slug: 'sales_agent' },
      { name: 'Team Lead', slug: 'team_lead' },
      { name: 'Senior Executive', slug: 'senior_executive' },
      { name: 'Executive', slug: 'executive' }
    ];

    for (const role of roles) {
      await Role.findOneAndUpdate(
        { slug: role.slug },
        role,
        { upsert: true, new: true }
      );
    }

    // Create statuses
    const statuses = [
      { name: 'Active', slug: 'active' },
      { name: 'Inactive', slug: 'inactive' },
      { name: 'Pending', slug: 'pending' },
      { name: 'Suspended', slug: 'suspended' },
      { name: 'On Leave', slug: 'on_leave' },
      { name: 'Terminated', slug: 'terminated' }
    ];

    for (const status of statuses) {
      await Status.findOneAndUpdate(
        { slug: status.slug },
        status,
        { upsert: true, new: true }
      );
    }

    // Create centres
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

    for (const centre of centres) {
      await Centre.findOneAndUpdate(
        { slug: centre.slug },
        centre,
        { upsert: true, new: true }
      );
    }

    // Create languages
    const Language = require('../models/Language');
    const languages = [
      { name: 'English', slug: 'english', code: 'en' },
      { name: 'Hindi', slug: 'hindi', code: 'hi' },
      { name: 'Tamil', slug: 'tamil', code: 'ta' },
      { name: 'Telugu', slug: 'telugu', code: 'te' },
      { name: 'Kannada', slug: 'kannada', code: 'kn' },
      { name: 'Malayalam', slug: 'malayalam', code: 'ml' },
      { name: 'Bengali', slug: 'bengali', code: 'bn' },
      { name: 'Marathi', slug: 'marathi', code: 'mr' },
      { name: 'Gujarati', slug: 'gujarati', code: 'gu' },
      { name: 'Punjabi', slug: 'punjabi', code: 'pa' }
    ];

    for (const language of languages) {
      await Language.findOneAndUpdate(
        { slug: language.slug },
        language,
        { upsert: true, new: true }
      );
    }

    // Create admin user if not exists
    const adminRole = await Role.findOne({ slug: 'admin' });
    const activeStatus = await Status.findOne({ slug: 'active' });
    
    if (!adminRole || !activeStatus) {
      throw new Error('Admin role or active status not found');
    }
    
    const adminExists = await User.findOne({ email: 'admin@lms.com', deletedAt: null });
    
    if (!adminExists) {
      const adminUser = new User({
        name: 'Admin User',
        email: 'admin@lms.com',
        mobileNumber: '1234567890',
        password: 'admin123',
        designation: 'System Administrator',
        roleId: adminRole._id,
        statusId: activeStatus._id,
        qualification: 'high_value'
      });
      
      const savedAdmin = await adminUser.save();
      // Set createdBy to self after creation
      savedAdmin.createdBy = savedAdmin._id;
      await savedAdmin.save();
      console.log('Admin user created successfully');
    } else {
      console.log('Admin user already exists');
    }

    res.json({ message: 'System initialized successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all roles
router.get('/roles', async (req, res) => {
  try {
    const roles = await Role.find({ deletedAt: null });
    res.json(roles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all statuses
router.get('/statuses', async (req, res) => {
  try {
    const statuses = await Status.find({ deletedAt: null });
    res.json(statuses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all centres
router.get('/centres', async (req, res) => {
  try {
    const centres = await Centre.find({ deletedAt: null });
    res.json(centres);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;