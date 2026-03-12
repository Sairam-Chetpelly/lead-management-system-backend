const mongoose = require('mongoose');
const Category = require('./models/Category');
require('dotenv').config();

const defaultCategories = [
  { name: 'Identity' },
  { name: 'Financial' },
  { name: 'Property' },
  { name: 'Agreement' },
  { name: 'Other' }
];

async function seedCategories() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    for (const cat of defaultCategories) {
      const existing = await Category.findOne({ name: cat.name, deletedAt: null });
      if (!existing) {
        await Category.create(cat);
        console.log(`Created category: ${cat.name}`);
      } else {
        console.log(`Category already exists: ${cat.name}`);
      }
    }

    console.log('Category seeding completed!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding categories:', error);
    process.exit(1);
  }
}

seedCategories();
