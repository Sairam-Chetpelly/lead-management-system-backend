const { body, validationResult } = require('express-validator');
const Role = require('../models/Role');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

const validateCreateUser = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('mobileNumber').notEmpty().withMessage('Mobile number is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('designation').notEmpty().withMessage('Designation is required'),
  body('roleId').notEmpty().withMessage('Role is required'),
  body('statusId').notEmpty().withMessage('Status is required'),
  body('qualification').isIn(['high_value', 'low_value']).withMessage('Invalid qualification'),
  body('userType').custom(async (value, { req }) => {
    const role = await Role.findById(req.body.roleId);
    if (role && role.slug === 'presales_agent') {
      if (!value || !['regular', 'cp_presales'].includes(value)) {
        throw new Error('User type is required for presales agents');
      }
    }
    return true;
  }),
  validate
];

module.exports = {
  validateCreateUser
};
