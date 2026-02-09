const axios = require('axios');
const MetaToken = require('../models/MetaToken');

// Get current token from database
async function getCurrentToken() {
  const tokenDoc = await MetaToken.findOne({ isActive: true }).sort({ createdAt: -1 });
  return tokenDoc?.accessToken || process.env.META_USER_ACCESS_TOKEN;
}

// Refresh Meta access token
async function refreshMetaToken() {
  try {
    const currentToken = await getCurrentToken();
    
    if (!currentToken) {
      throw new Error('No current token found');
    }

    // Exchange for new long-lived token
    const response = await axios.get('https://graph.facebook.com/v23.0/oauth/access_token', {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: process.env.META_APP_ID,
        client_secret: process.env.META_APP_SECRET,
        fb_exchange_token: currentToken
      }
    });

    const newToken = response.data.access_token;
    const expiresIn = response.data.expires_in || 5184000; // 60 days default
    const expiresAt = new Date(Date.now() + (expiresIn * 1000));

    // Deactivate old tokens
    await MetaToken.updateMany({ isActive: true }, { isActive: false });
    
    // Save new token to database
    const tokenDoc = new MetaToken({
      accessToken: newToken,
      expiresAt,
      refreshedAt: new Date()
    });
    await tokenDoc.save();
    
    console.log('Meta token refreshed and stored in database');
    console.log(`New token expires at: ${expiresAt}`);
    
    return { token: newToken, expiresIn, expiresAt };
    
  } catch (error) {
    console.error('Error refreshing Meta token:', error.response?.data || error.message);
    throw error;
  }
}

// Initialize token from env to database
async function initializeToken() {
  try {
    const existingToken = await MetaToken.findOne({ isActive: true });
    if (!existingToken && process.env.META_USER_ACCESS_TOKEN) {
      const tokenDoc = new MetaToken({
        accessToken: process.env.META_USER_ACCESS_TOKEN,
        expiresAt: new Date(Date.now() + (60 * 24 * 60 * 60 * 1000)), // 60 days
        refreshedAt: new Date()
      });
      await tokenDoc.save();
      console.log('Meta token initialized in database');
    }
  } catch (error) {
    console.error('Error initializing token:', error);
  }
}

module.exports = { refreshMetaToken, getCurrentToken, initializeToken };