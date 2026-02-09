# Migration Checklist

## ✅ Phase 1: Foundation (COMPLETED)

### Directory Structure
- [x] Create `src/` directory
- [x] Create `src/config/` directory
- [x] Create `src/middlewares/` directory
- [x] Create `src/modules/` directory
- [x] Create `src/routes/` directory
- [x] Create `src/services/` directory
- [x] Create `src/utils/` directory
- [x] Create `src/validations/` directory

### Configuration Files
- [x] Create `src/config/database.js`
- [x] Create `src/config/cors.js`
- [x] Create `src/config/rateLimiter.js`

### Core Files
- [x] Create `src/app.js`
- [x] Create `src/server.js`
- [x] Update `package.json`

### Documentation
- [x] Create `src/README.md`
- [x] Create `MIGRATION.md`
- [x] Create `QUICKSTART.md`
- [x] Create `RESTRUCTURING_SUMMARY.md`
- [x] Create `ARCHITECTURE.md`
- [x] Create `MIGRATION_CHECKLIST.md` (this file)

## ✅ Phase 2: Auth Module (COMPLETED)

### Auth Module
- [x] Create `src/modules/auth/` directory
- [x] Create `src/modules/auth/auth.controller.js`
  - [x] login()
  - [x] checkStatus()
  - [x] forgotPassword()
  - [x] resetPassword()
- [x] Create `src/routes/auth.routes.js`
- [x] Create `src/validations/auth.validation.js`
  - [x] validateLogin
  - [x] validateForgotPassword
  - [x] validateResetPassword
- [x] Create `src/services/emailService.js`
  - [x] sendPasswordResetEmail()
- [x] Test auth endpoints
  - [x] POST /api/auth/login
  - [x] GET /api/auth/status
  - [x] POST /api/auth/forgot-password
  - [x] POST /api/auth/reset-password

## ✅ Phase 3: User Module (COMPLETED)

### User Module
- [x] Create `src/modules/user/` directory
- [x] Create `src/modules/user/user.controller.js`
  - [x] getAll()
  - [x] create()
  - [x] update()
  - [x] delete()
  - [x] export()
- [x] Create `src/modules/user/user.upload.js`
  - [x] uploadProfileImage()
  - [x] serveProfileImage()
- [x] Create `src/routes/user.routes.js`
- [x] Create `src/validations/user.validation.js`
  - [x] validateCreateUser
- [x] Test user endpoints
  - [x] GET /api/users
  - [x] POST /api/users
  - [x] PUT /api/users/:id
  - [x] DELETE /api/users/:id
  - [x] GET /api/users/export
  - [x] POST /api/users/:id/profile-image
  - [x] GET /api/users/profile-image/:filename

## 🔄 Phase 4: Admin Module (TODO)

### Admin Module Structure
- [ ] Create `src/modules/admin/` directory
- [ ] Create `src/modules/admin/admin.controller.js`
  - [ ] getRoles()
  - [ ] createRole()
  - [ ] updateRole()
  - [ ] deleteRole()
  - [ ] getCentres()
  - [ ] createCentre()
  - [ ] updateCentre()
  - [ ] deleteCentre()
  - [ ] getLanguages()
  - [ ] createLanguage()
  - [ ] updateLanguage()
  - [ ] deleteLanguage()
  - [ ] getStatuses()
  - [ ] createStatus()
  - [ ] updateStatus()
  - [ ] deleteStatus()
  - [ ] getUsers()
  - [ ] deleteUser()
  - [ ] getLeads()
  - [ ] deleteLead()
- [ ] Create `src/routes/admin.routes.js`
- [ ] Create `src/validations/admin.validation.js`
- [ ] Create `src/services/adminService.js` (if needed)
- [ ] Test admin endpoints

### Admin Endpoints to Migrate
- [ ] GET /api/admin/roles
- [ ] POST /api/admin/roles
- [ ] PUT /api/admin/roles/:id
- [ ] DELETE /api/admin/roles/:id
- [ ] GET /api/admin/roles/all
- [ ] GET /api/admin/centres
- [ ] POST /api/admin/centres
- [ ] PUT /api/admin/centres/:id
- [ ] DELETE /api/admin/centres/:id
- [ ] GET /api/admin/centres/all
- [ ] GET /api/admin/languages
- [ ] POST /api/admin/languages
- [ ] PUT /api/admin/languages/:id
- [ ] DELETE /api/admin/languages/:id
- [ ] GET /api/admin/languages/all
- [ ] GET /api/admin/statuses
- [ ] POST /api/admin/statuses
- [ ] PUT /api/admin/statuses/:id
- [ ] DELETE /api/admin/statuses/:id
- [ ] GET /api/admin/statuses/all
- [ ] GET /api/admin/users
- [ ] DELETE /api/admin/users/:id
- [ ] DELETE /api/admin/leads/:id

## 🔄 Phase 5: Lead Module (TODO)

### Lead Module Structure
- [ ] Create `src/modules/lead/` directory
- [ ] Create `src/modules/lead/lead.controller.js`
  - [ ] getAll()
  - [ ] getById()
  - [ ] create()
  - [ ] update()
  - [ ] delete()
  - [ ] assign()
  - [ ] changeLanguage()
  - [ ] export()
- [ ] Create `src/modules/lead/lead.webhook.js`
  - [ ] handleGoogleAds()
  - [ ] handleMetaAds()
  - [ ] verifyMetaWebhook()
- [ ] Create `src/modules/lead/lead.bulk.js`
  - [ ] bulkUploadPresales()
  - [ ] bulkUploadSales()
- [ ] Create `src/modules/lead/lead.activity.js`
  - [ ] logCall()
  - [ ] logActivity()
  - [ ] getTimeline()
- [ ] Create `src/routes/lead.routes.js`
- [ ] Create `src/validations/lead.validation.js`
- [ ] Create `src/services/leadService.js`
- [ ] Create `src/services/webhookService.js`
- [ ] Test lead endpoints

### Lead Endpoints to Migrate
- [ ] GET /api/leads
- [ ] GET /api/leads/:id
- [ ] POST /api/leads
- [ ] PUT /api/leads/:id
- [ ] DELETE /api/leads/:id
- [ ] POST /api/leads/bulk-upload
- [ ] POST /api/leads/bulk-upload-sales
- [ ] GET /api/leads/export
- [ ] POST /api/leads/:id/assign
- [ ] POST /api/leads/:id/change-language
- [ ] POST /api/leads/:id/call
- [ ] POST /api/leads/:id/activity
- [ ] POST /api/leads/:id/lead-activity
- [ ] GET /api/leads/:id/timeline
- [ ] GET /api/leads/document/:filename
- [ ] POST /api/leads/webhook/google-ads
- [ ] GET /api/leads/webhook/meta-ads
- [ ] POST /api/leads/webhook/meta-ads

## 🔄 Phase 6: Dashboard Module (TODO)

### Dashboard Module Structure
- [ ] Create `src/modules/dashboard/` directory
- [ ] Create `src/modules/dashboard/dashboard.controller.js`
  - [ ] getAdminStats()
  - [ ] getPresalesStats()
  - [ ] getSalesStats()
- [ ] Create `src/routes/dashboard.routes.js`
- [ ] Create `src/services/dashboardService.js`
- [ ] Test dashboard endpoints

### Dashboard Endpoints to Migrate
- [ ] GET /api/dashboard/admin
- [ ] GET /api/dashboard/presales (if exists)
- [ ] GET /api/dashboard/sales (if exists)

## 🔄 Phase 7: Supporting Modules (TODO)

### Call Logs Module
- [ ] Create `src/modules/callLog/` directory
- [ ] Create `src/modules/callLog/callLog.controller.js`
- [ ] Create `src/routes/callLog.routes.js`
- [ ] Test call log endpoints

### Activity Logs Module
- [ ] Create `src/modules/activityLog/` directory
- [ ] Create `src/modules/activityLog/activityLog.controller.js`
- [ ] Create `src/routes/activityLog.routes.js`
- [ ] Test activity log endpoints

### Lead Activities Module
- [ ] Create `src/modules/leadActivity/` directory
- [ ] Create `src/modules/leadActivity/leadActivity.controller.js`
- [ ] Create `src/routes/leadActivity.routes.js`
- [ ] Test lead activity endpoints

### Lead Sources Module
- [ ] Create `src/modules/leadSource/` directory
- [ ] Create `src/modules/leadSource/leadSource.controller.js`
- [ ] Create `src/routes/leadSource.routes.js`
- [ ] Test lead source endpoints

### Project & House Types Module
- [ ] Create `src/modules/projectHouseType/` directory
- [ ] Create `src/modules/projectHouseType/projectHouseType.controller.js`
- [ ] Create `src/routes/projectHouseType.routes.js`
- [ ] Test project house type endpoints

### Meta Module
- [ ] Create `src/modules/meta/` directory
- [ ] Create `src/modules/meta/meta.controller.js`
- [ ] Create `src/routes/meta.routes.js`
- [ ] Test meta endpoints

## 🔄 Phase 8: Services (TODO)

### Additional Services
- [ ] Create `src/services/whatsappService.js` (move from utils)
- [ ] Create `src/services/smsService.js`
- [ ] Create `src/services/notificationService.js`
- [ ] Create `src/services/fileService.js`
- [ ] Create `src/services/csvService.js`
- [ ] Create `src/services/assignmentService.js` (lead assignment logic)

## 🔄 Phase 9: Middleware Enhancements (TODO)

### Error Handling
- [ ] Create `src/middlewares/errorHandler.js`
  - [ ] Global error handler
  - [ ] Error logging
  - [ ] Error formatting

### Logging
- [ ] Create `src/middlewares/logger.js`
  - [ ] Request logging
  - [ ] Response logging
  - [ ] Performance monitoring

### Validation
- [ ] Create `src/middlewares/validator.js`
  - [ ] Generic validation middleware
  - [ ] Custom validators

### Security
- [ ] Create `src/middlewares/security.js`
  - [ ] Helmet integration
  - [ ] XSS protection
  - [ ] SQL injection protection

## 🔄 Phase 10: Testing (TODO)

### Unit Tests
- [ ] Set up Jest/Mocha
- [ ] Test auth controller
- [ ] Test user controller
- [ ] Test admin controller
- [ ] Test lead controller
- [ ] Test dashboard controller
- [ ] Test services
- [ ] Test utilities

### Integration Tests
- [ ] Test auth flow
- [ ] Test user CRUD
- [ ] Test lead CRUD
- [ ] Test webhooks
- [ ] Test bulk upload
- [ ] Test file upload

### API Tests
- [ ] Set up Postman/Newman
- [ ] Create test collections
- [ ] Automate API tests

## 🔄 Phase 11: Documentation (TODO)

### API Documentation
- [ ] Set up Swagger/OpenAPI
- [ ] Document auth endpoints
- [ ] Document user endpoints
- [ ] Document admin endpoints
- [ ] Document lead endpoints
- [ ] Document dashboard endpoints

### Code Documentation
- [ ] Add JSDoc comments
- [ ] Document complex functions
- [ ] Add inline comments

### Developer Guides
- [ ] Create contribution guide
- [ ] Create coding standards
- [ ] Create deployment guide

## 🔄 Phase 12: Optimization (TODO)

### Performance
- [ ] Add caching (Redis)
- [ ] Optimize database queries
- [ ] Add database indexes
- [ ] Implement pagination everywhere
- [ ] Add query optimization

### Security
- [ ] Security audit
- [ ] Dependency audit
- [ ] Add security headers
- [ ] Implement CSRF protection
- [ ] Add input sanitization

### Monitoring
- [ ] Add application monitoring
- [ ] Add error tracking (Sentry)
- [ ] Add performance monitoring
- [ ] Add logging (Winston)

## 🔄 Phase 13: Cleanup (TODO)

### Remove Old Code
- [ ] Remove old `server.js` (after full migration)
- [ ] Remove old `routes/` directory (after full migration)
- [ ] Clean up unused dependencies
- [ ] Remove commented code
- [ ] Remove console.logs

### Final Testing
- [ ] Test all endpoints
- [ ] Test error scenarios
- [ ] Test edge cases
- [ ] Load testing
- [ ] Security testing

## 📊 Progress Tracking

### Overall Progress
- ✅ Phase 1: Foundation (100%)
- ✅ Phase 2: Auth Module (100%)
- ✅ Phase 3: User Module (100%)
- ⏳ Phase 4: Admin Module (0%)
- ⏳ Phase 5: Lead Module (0%)
- ⏳ Phase 6: Dashboard Module (0%)
- ⏳ Phase 7: Supporting Modules (0%)
- ⏳ Phase 8: Services (0%)
- ⏳ Phase 9: Middleware Enhancements (0%)
- ⏳ Phase 10: Testing (0%)
- ⏳ Phase 11: Documentation (0%)
- ⏳ Phase 12: Optimization (0%)
- ⏳ Phase 13: Cleanup (0%)

**Total Progress: 23% (3/13 phases complete)**

## 🎯 Next Immediate Steps

1. **Migrate Admin Module**
   - Start with roles CRUD
   - Then centres, languages, statuses
   - Test each endpoint

2. **Migrate Lead Module**
   - Start with basic CRUD
   - Then webhooks
   - Then bulk upload
   - Test thoroughly

3. **Migrate Dashboard Module**
   - Extract statistics logic
   - Create dashboard service
   - Test with different roles

## 📝 Notes

- Keep old structure working during migration
- Test each module before moving to next
- Update documentation as you go
- Commit after each completed phase
- Run both old and new in parallel for testing

## 🚀 Quick Commands

```bash
# Start new structure
npm run dev

# Start old structure (fallback)
npm run dev:old

# Run tests (when implemented)
npm test

# Check code quality
npm run lint

# Format code
npm run format
```

---

**Last Updated**: 2025
**Current Phase**: Phase 4 (Admin Module)
**Next Milestone**: Complete Admin Module Migration
