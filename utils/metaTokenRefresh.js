const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Refresh Meta access token
async function refreshMetaToken() {
  try {
    const currentToken = process.env.META_USER_ACCESS_TOKEN;
    
    if (!currentToken) {
      throw new Error('No current token found');
    }

    // Exchange short-lived token for long-lived token
    const response = await axios.get('https://graph.facebook.com/v23.0/oauth/access_token', {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: process.env.META_APP_ID,
        client_secret: process.env.META_APP_SECRET,
        fb_exchange_token: currentToken
      }
    });

    const newToken = response.data.access_token;
    const expiresIn = response.data.expires_in;

    // Update .env file
    const envPath = path.join(__dirname, '../.env');
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    envContent = envContent.replace(
      /META_USER_ACCESS_TOKEN=.*/,
      `META_USER_ACCESS_TOKEN=${newToken}`
    );
    
    fs.writeFileSync(envPath, envContent);
    
    // Update process.env
    process.env.META_USER_ACCESS_TOKEN = newToken;
    
    console.log('Meta token refreshed successfully');
    console.log(`New token expires in: ${expiresIn} seconds`);
    
    return { token: newToken, expiresIn };
    
  } catch (error) {
    console.error('Error refreshing Meta token:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = { refreshMetaToken };