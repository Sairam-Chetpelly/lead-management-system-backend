# Migration Guide: Monolithic to Modular Structure

## Overview

This guide explains how to migrate from the old monolithic structure to the new modular architecture.

## Old vs New Structure

### Old Structure (Monolithic)
```
backend/
├── server.js           # Everything in one file
├── routes/             # Route files with mixed logic
├── models/             # Database models
├── middleware/         # Middleware
└── utils/              # Utilities
```

### New Structure (Modular)
```
backend/
├── src/
│   ├── config/         # Configuration
│   ├── middlewares/    # Middleware
│   ├── modules/        # Feature modules
│   ├── routes/         # Clean route definitions
│   ├── services/       # Business logic
│   ├── utils/          # Utilities
│   ├── validations/    # Input validation
│   ├── app.js          # Express setup
│   └── server.js       # Entry point
├── models/             # Database models (unchanged)
└── uploads/            # File uploads (unchanged)
```

## Migration Steps

### Step 1: Create New Directory Structure

```bash
cd backend
mkdir -p src/{config,middlewares,modules,routes,services,utils,validations}
```

### Step 2: Move Configuration

Extract configuration from server.js to separate files:

**Before (server.js):**
```javascript
const corsOptions = {
  origin: process.env.CORS_ORIGINS?.split(','),
  credentials: true
};
app.use(cors(corsOptions));
```

**After (src/config/cors.js):**
```javascript
const corsOptions = {
  origin: process.env.CORS_ORIGINS?.split(','),
  credentials: true
};
module.exports = corsOptions;
```

### Step 3: Create Controllers

Extract business logic from routes to controllers:

**Before (routes/auth.js):**
```javascript
router.post('/login', async (req, res) => {
  // Business logic here
});
```

**After:**

**Controller (src/modules/auth/auth.controller.js):**
```javascript
class AuthController {
  async login(req, res) {
    // Business logic here
  }
}
module.exports = new AuthController();
```

**Route (src/routes/auth.routes.js):**
```javascript
const authController = require('../modules/auth/auth.controller');
router.post('/login', validateLogin, authController.login);
```

### Step 4: Extract Validations

Move validation logic to separate files:

**Before (routes/auth.js):**
```javascript
router.post('/login', [
  body('email').isEmail(),
  body('password').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  // ...
});
```

**After (src/validations/auth.validation.js):**
```javascript
const validateLogin = [
  body('email').isEmail(),
  body('password').notEmpty(),
  validate
];
module.exports = { validateLogin };
```

### Step 5: Create Services

Extract reusable business logic:

**Before (routes/auth.js):**
```javascript
// Email sending logic in route
const transporter = nodemailer.createTransport({...});
await transporter.sendMail({...});
```

**After (src/services/emailService.js):**
```javascript
const sendPasswordResetEmail = async (email, resetUrl) => {
  // Email logic here
};
module.exports = { sendPasswordResetEmail };
```

### Step 6: Update Entry Point

**New server.js:**
```javascript
const app = require('./app');
const connectDB = require('./config/database');

connectDB();

if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
```

### Step 7: Update package.json

```json
{
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js"
  }
}
```

## Module Template

Use this template for new modules:

```javascript
// src/modules/[feature]/[feature].controller.js
const Model = require('../../models/Model');

class FeatureController {
  async getAll(req, res) {
    try {
      const items = await Model.find();
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async create(req, res) {
    try {
      const item = new Model(req.body);
      await item.save();
      res.status(201).json(item);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async update(req, res) {
    try {
      const item = await Model.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      );
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async delete(req, res) {
    try {
      await Model.findByIdAndDelete(req.params.id);
      res.json({ message: 'Deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new FeatureController();
```

## Testing the Migration

1. **Test old structure:**
```bash
npm run start:old
```

2. **Test new structure:**
```bash
npm run dev
```

3. **Verify endpoints:**
```bash
# Test auth
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@lms.com","password":"admin123"}'

# Test users
curl http://localhost:5000/api/users \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Common Issues

### Issue 1: Module Not Found
**Error:** `Cannot find module '../modules/...'`

**Solution:** Check relative paths in require statements

### Issue 2: Middleware Order
**Error:** Routes not protected

**Solution:** Ensure middleware is applied before routes in app.js

### Issue 3: Model Imports
**Error:** `Model is not defined`

**Solution:** Update model import paths:
```javascript
// Old
const User = require('../models/User');

// New (from controller)
const User = require('../../models/User');
```

## Best Practices

1. **One responsibility per file**
2. **Use async/await consistently**
3. **Handle errors properly**
4. **Validate input at route level**
5. **Keep controllers thin, services fat**
6. **Use dependency injection where possible**
7. **Write tests for each module**

## Rollback Plan

If issues occur, rollback to old structure:

```bash
# Use old entry point
npm run start:old

# Or update package.json
{
  "main": "server.js"
}
```

## Next Steps

1. Migrate remaining modules (admin, lead, dashboard)
2. Add error handling middleware
3. Add logging middleware
4. Write unit tests
5. Add API documentation
6. Set up CI/CD pipeline
