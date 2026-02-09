const cron = require('node-cron');
const { refreshMetaToken, initializeToken } = require('./metaTokenRefresh');

// Schedule daily token refresh at 2 AM
function startTokenScheduler() {
  // Initialize token on startup
  initializeToken();
  
  // Schedule daily refresh at 2:00 AM
  cron.schedule('0 2 * * *', async () => {
    console.log('Running scheduled Meta token refresh...');
    try {
      await refreshMetaToken();
      console.log('Scheduled token refresh completed successfully');
    } catch (error) {
      console.error('Scheduled token refresh failed:', error);
    }
  });
  
  console.log('Meta token scheduler started - will refresh daily at 2:00 AM');
}

module.exports = { startTokenScheduler };