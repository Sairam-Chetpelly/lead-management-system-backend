const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  mobileNumber: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  designation: {
    type: String,
    required: true
  },
  centreId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Centre',
    default: null
  },
  roleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    required: true
  },
  statusId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Status',
    required: true
  },
  languageIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Language'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  qualification: {
    type: String,
    enum: ['high_value', 'low_value'],
    required: true
  },
  userType: {
    type: String,
    enum: ['regular', 'cp_presales'],
    required: false,
    validate: {
      validator: async function(value) {
        // Allow undefined or null values
        if (!value) return true;
        if (!this.roleId) return true;
        const role = await mongoose.model('Role').findById(this.roleId);
        if (role && role.slug === 'presales_agent') {
          return ['regular', 'cp_presales'].includes(value);
        }
        return true; // Not required for other roles
      },
      message: 'User type is required for presales agents'
    }
  },
  profileImage: {
    type: String,
    default: null
  },
  resetPasswordToken: {
    type: String,
    default: null
  },
  resetPasswordExpiry: {
    type: Date,
    default: null
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

userSchema.pre('save', async function(next) {
  if (!this.userId) {
    const count = await mongoose.model('User').countDocuments();
    this.userId = `USR${String(count + 1).padStart(6, '0')}`;
  }
  
  // Clean up empty string userType
  if (this.userType === '') {
    this.userType = undefined;
  }
  
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);