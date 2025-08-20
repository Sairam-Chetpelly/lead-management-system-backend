const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  leadID: {
    type: String,
    unique: true,
    required: false
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

leadSchema.pre('save', async function(next) {
  if (!this.leadID) {
    const count = await mongoose.model('Lead').countDocuments();
    this.leadID = `LEAD${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Lead', leadSchema);