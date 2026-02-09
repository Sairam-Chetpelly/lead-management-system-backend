# Backend Modular Structure

## Project Structure

```
src/
├── config/              # Configuration files
│   ├── database.js      # MongoDB connection
│   ├── cors.js          # CORS configuration
│   └── rateLimiter.js   # Rate limiting configuration
│
├── middlewares/         # Custom middleware
│   ├── auth.js          # JWT authentication middleware
│   └── apiKeyAuth.js    # API key authentication
│
├── modules/             # Feature modules
│   ├── auth/            # Authentication module
│   │   └── auth.controller.js
│   └── user/            # User management module
│       ├── user.controller.js
│       └── user.upload.js
│
├── models/              # Mongoose models
│   ├── User.js
│   ├── Role.js
│   ├── Lead.js
│   └── ...
│
├── routes/              # Route definitions
│   ├── auth.routes.js
│   ├── user.routes.js
│   └── index.js
│
├── services/            # Business logic services
│   └── emailService.js  # Email service (nodemailer)
│
├── utils/               # Utility functions
│   ├── crudController.js
│   ├── whatsappService.js
│   └── ...
│
├── validations/         # Validation schemas
│   ├── auth.validation.js
│   └── user.validation.js
│
├── app.js               # Express app setup
└── server.js            # Server entry point
```

## Module Structure

Each module follows this pattern:

```
modules/
└── [feature]/
    ├── [feature].controller.js  # Business logic
    ├── [feature].service.js     # Optional: Complex business logic
    └── [feature].*.js           # Other feature-specific files
```

## How to Use

### Running the Application

```bash
# Development mode (uses new structure)
npm run dev

# Production mode (uses new structure)
npm start

# Run with old structure (fallback)
npm run dev:old
npm run start:old
```

### Adding a New Module

1. Create module directory:
```bash
mkdir -p src/modules/[feature]
```

2. Create controller:
```javascript
// src/modules/[feature]/[feature].controller.js
class FeatureController {
  async getAll(req, res) {
    // Implementation
  }
}
module.exports = new FeatureController();
```

3. Create routes:
```javascript
// src/routes/[feature].routes.js
const express = require('express');
const featureController = require('../modules/[feature]/[feature].controller');
const router = express.Router();

router.get('/', featureController.getAll);

module.exports = router;
```

4. Create validation (optional):
```javascript
// src/validations/[feature].validation.js
const { body, validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

module.exports = { validate };
```

5. Register routes in app.js:
```javascript
const featureRoutes = require('./routes/[feature].routes');
app.use('/api/[feature]', featureRoutes);
```

## Migration Status

### ✅ Completed
- [x] Config files (database, cors, rate limiter)
- [x] Auth module (login, forgot password, reset password)
- [x] User module (CRUD, profile upload, export)
- [x] Email service
- [x] Validations (auth, user)
- [x] Main app.js and server.js

### 🔄 Pending (Using old structure)
- [ ] Admin module (roles, centres, languages, statuses)
- [ ] Lead module (CRUD, bulk upload, webhooks)
- [ ] Dashboard module
- [ ] Call logs module
- [ ] Activity logs module
- [ ] Lead activities module
- [ ] Meta module

## Benefits of New Structure

1. **Separation of Concerns**: Each module handles its own logic
2. **Maintainability**: Easy to locate and update code
3. **Scalability**: Simple to add new features
4. **Testability**: Isolated modules are easier to test
5. **Reusability**: Services and utilities can be shared
6. **Clean Code**: Better organization and readability

## Configuration

All configuration is centralized in `src/config/`:
- Database connection
- CORS settings
- Rate limiting
- Environment variables

## Middleware

Custom middleware in `src/middlewares/`:
- JWT authentication
- API key validation
- Error handling (can be added)

## Services

Reusable business logic in `src/services/`:
- Email service (password reset, notifications)
- WhatsApp service
- Token refresh service

## Validations

Input validation schemas in `src/validations/`:
- Express-validator based
- Reusable validation middleware
- Centralized error handling

## Next Steps

To complete the migration:

1. Migrate admin routes to `src/modules/admin/`
2. Migrate lead routes to `src/modules/lead/`
3. Migrate dashboard to `src/modules/dashboard/`
4. Create services for complex business logic
5. Add error handling middleware
6. Add logging middleware
7. Add unit tests for each module
