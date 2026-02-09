# Models Structure

## ✅ All Models Converted

All 13 models are now properly organized in the modular structure:

```
src/models/
├── ActivityLog.js           ✅ Activity logging
├── CallLog.js               ✅ Call tracking
├── Centre.js                ✅ Office/branch locations
├── GoogleAdsHistory.js      ✅ Google Ads webhook history
├── Language.js              ✅ Language support
├── Lead.js                  ✅ Main lead records
├── LeadActivity.js          ✅ Lead activity history
├── LeadSource.js            ✅ Lead source definitions
├── MetaToken.js             ✅ Meta API tokens
├── ProjectAndHouseType.js   ✅ Property types
├── Role.js                  ✅ User roles
├── Status.js                ✅ Lead/user statuses
└── User.js                  ✅ User accounts
```

## Import Paths

### From Controllers (src/modules/*/*)
```javascript
const User = require('../models/User');
const Lead = require('../models/Lead');
const Role = require('../models/Role');
```

### From Services (src/services/*)
```javascript
const User = require('../models/User');
```

### From Validations (src/validations/*)
```javascript
const Role = require('../models/Role');
```

## Model Relationships

```
User
├── roleId → Role
├── statusId → Status
├── centreId → Centre
└── languageIds → [Language]

Lead
├── presalesUserId → User
├── salesUserId → User
├── centreId → Centre
├── languageId → Language
├── leadSourceId → LeadSource
├── statusId → Status
└── projectHouseTypeId → ProjectAndHouseType

LeadActivity
├── leadId → Lead
├── presalesUserId → User
├── salesUserId → User
├── centreId → Centre
├── languageId → Language
├── leadSourceId → LeadSource
├── statusId → Status
└── updatedPerson → User

CallLog
├── leadId → Lead
└── userId → User

ActivityLog
├── leadId → Lead
└── userId → User
```

## ✅ Path Updates Complete

All import paths have been updated in:
- ✅ src/modules/auth/auth.controller.js
- ✅ src/modules/user/user.controller.js
- ✅ src/modules/user/user.upload.js
- ✅ src/validations/user.validation.js

## Usage Example

```javascript
// In any controller (src/modules/*/*)
const User = require('../models/User');
const Lead = require('../models/Lead');
const Role = require('../models/Role');

class FeatureController {
  async getAll(req, res) {
    try {
      const users = await User.find()
        .populate('roleId')
        .populate('centreId');
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}
```

## ✅ Status

- **Total Models**: 13
- **Location**: src/models/
- **Import Paths**: Updated
- **Status**: All converted and working
