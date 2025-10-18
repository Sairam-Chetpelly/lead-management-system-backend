const nodemailer = require('nodemailer');
const axios = require('axios');
const { getCurrentToken } = require('./metaTokenRefresh');

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Send pre-creation email notification
async function sendPreCreationEmail(leadData) {
  try {
    const subject = 'New Lead Processing - Meta Ads';
    const message = `
      <h3>New Lead Being Processed</h3>
      <p>A new lead from Meta Ads is being processed with the following details:</p>
      <ul>
        <li><strong>Name:</strong> ${leadData.name || 'N/A'}</li>
        <li><strong>Email:</strong> ${leadData.email || 'N/A'}</li>
        <li><strong>Phone:</strong> ${leadData.contactNumber || 'N/A'}</li>
        <li><strong>Source:</strong> ${leadData.source || 'Meta Ads'}</li>
        <li><strong>Platform:</strong> ${leadData.platform || 'Facebook'}</li>
        <li><strong>Lead ID:</strong> ${leadData.leadgen_id || 'N/A'}</li>
        <li><strong>Form ID:</strong> ${leadData.form_id || 'N/A'}</li>
      </ul>
      <p><strong>Time:</strong> ${new Date().toISOString()}</p>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: 'sairamchettpelli@gmail.com,crm@reminiscent.in,amit@reminiscent.in,mace@reminiscent.in,abhijeet@reminiscent.in',
      subject: subject,
      html: message
    });

    console.log('Pre-creation email sent successfully');
  } catch (error) {
    console.error('Failed to send pre-creation email:', error);
  }
}

// Send post-creation email notification
async function sendPostCreationEmail(leadData, createdLead) {
  try {
    const subject = 'Lead Created Successfully - Meta Ads';
    const message = `
      <h3>Lead Created Successfully</h3>
      <p>A new lead from Meta Ads has been successfully created:</p>
      <ul>
        <li><strong>Lead ID:</strong> ${createdLead.leadID}</li>
        <li><strong>Name:</strong> ${createdLead.name || 'N/A'}</li>
        <li><strong>Email:</strong> ${createdLead.email || 'N/A'}</li>
        <li><strong>Phone:</strong> ${createdLead.contactNumber}</li>
        <li><strong>Source:</strong> ${leadData.source || 'Meta Ads'}</li>
        <li><strong>Platform:</strong> ${leadData.platform || 'Facebook'}</li>
        <li><strong>Assigned To:</strong> ${leadData.assignedAgent || 'Unassigned'}</li>
        <li><strong>Meta Lead ID:</strong> ${leadData.leadgen_id || 'N/A'}</li>
        <li><strong>Form ID:</strong> ${leadData.form_id || 'N/A'}</li>
        <li><strong>Ad ID:</strong> ${leadData.ad_id || 'N/A'}</li>
      </ul>
      <p><strong>Created At:</strong> ${new Date().toISOString()}</p>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: 'sairamchettpelli@gmail.com,crm@reminiscent.in,amit@reminiscent.in,mace@reminiscent.in,abhijeet@reminiscent.in',
      subject: subject,
      html: message
    });

    console.log('Post-creation email sent successfully');
  } catch (error) {
    console.error('Failed to send post-creation email:', error);
  }
}

// Send error notification email
async function sendMetaErrorEmail(subject, message, errorDetails) {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: 'sairamchettpelli@gmail.com,crm@reminiscent.in,amit@reminiscent.in,mace@reminiscent.in,abhijeet@reminiscent.in',
      subject: subject,
      html: `
        <h3>${subject}</h3>
        <p>${message}</p>
        <h4>Error Details:</h4>
        <pre>${JSON.stringify(errorDetails, null, 2)}</pre>
        <p><strong>Time:</strong> ${new Date().toISOString()}</p>
      `
    });
  } catch (emailError) {
    console.error('Failed to send error email:', emailError);
  }
}

// Send API trigger email
async function sendApuTirggerEmail(data) {
  try {
    const subject = 'Meta Webhook API Triggered';
    const message = `
      <h3>Meta Webhook API Triggered</h3>
      <p>Meta Ads webhook has been triggered with the following request:</p>
      <ul>
        <li><strong>Timestamp:</strong> ${new Date().toISOString()}</li>
        <li><strong>Request Body:</strong> <pre>${JSON.stringify(data.requestBody, null, 2)}</pre></li>
        <li><strong>Entry Count:</strong> ${data.entryCount || 0}</li>
      </ul>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: 'sairamchettpelli@gmail.com,crm@reminiscent.in,amit@reminiscent.in,mace@reminiscent.in,abhijeet@reminiscent.in',
      subject: subject,
      html: message
    });

    console.log('API trigger email sent successfully');
  } catch (error) {
    console.error('Failed to send API trigger email:', error);
  }
}

// Send leadgen email
async function sendLeadgenEmail(data) {
  try {
    const subject = 'Meta Leadgen Data Received';
    const message = `
      <h3>Meta Leadgen Data Received</h3>
      <p>New leadgen data has been received from Meta:</p>
      <ul>
        <li><strong>Lead ID:</strong> ${data.leadgen_id}</li>
        <li><strong>Form ID:</strong> ${data.form_id}</li>
        <li><strong>Ad ID:</strong> ${data.ad_id}</li>
        <li><strong>AdGroup ID:</strong> ${data.adgroup_id}</li>
        <li><strong>Page ID:</strong> ${data.page_id}</li>
        <li><strong>Source:</strong> ${data.source}</li>
        <li><strong>Created Time:</strong> ${data.created_time || new Date().toISOString()}</li>
      </ul>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: 'sairamchettpelli@gmail.com,crm@reminiscent.in,amit@reminiscent.in,mace@reminiscent.in,abhijeet@reminiscent.in',
      subject: subject,
      html: message
    });

    console.log('Leadgen email sent successfully');
  } catch (error) {
    console.error('Failed to send leadgen email:', error);
  }
}

// Send platform detection email
async function sendPlatFormEmail(data) {
  try {
    const subject = 'Meta Platform Detection Result';
    const message = `
      <h3>Platform Detection Completed</h3>
      <p>Platform detection has been completed for the Meta ad:</p>
      <ul>
        <li><strong>Detected Platform:</strong> ${data.platform || 'Facebook'}</li>
        <li><strong>Ad ID:</strong> ${data.ad_id}</li>
        <li><strong>Instagram User ID:</strong> ${data.instagram_user_id || 'N/A'}</li>
        <li><strong>Detection Method:</strong> ${data.detection_method || 'Graph API'}</li>
        <li><strong>Timestamp:</strong> ${new Date().toISOString()}</li>
      </ul>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: 'sairamchettpelli@gmail.com,crm@reminiscent.in,amit@reminiscent.in,mace@reminiscent.in,abhijeet@reminiscent.in',
      subject: subject,
      html: message
    });

    console.log('Platform email sent successfully');
  } catch (error) {
    console.error('Failed to send platform email:', error);
  }
}

// Send graph response email
async function sendgraphResponseEmail(data) {
  try {
    const subject = 'Meta Graph API Response Received';
    const message = `
      <h3>Graph API Response Received</h3>
      <p>Successfully received response from Meta Graph API:</p>
      <ul>
        <li><strong>Lead ID:</strong> ${data.leadgen_id}</li>
        <li><strong>Response Status:</strong> ${data.status || 'Success'}</li>
        <li><strong>Field Data Count:</strong> ${data.fieldDataCount || 0}</li>
        <li><strong>Raw Response:</strong> <pre>${JSON.stringify(data.graphResponse, null, 2)}</pre></li>
        <li><strong>Timestamp:</strong> ${new Date().toISOString()}</li>
      </ul>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: 'sairamchettpelli@gmail.com,crm@reminiscent.in,amit@reminiscent.in,mace@reminiscent.in,abhijeet@reminiscent.in',
      subject: subject,
      html: message
    });

    console.log('Graph response email sent successfully');
  } catch (error) {
    console.error('Failed to send graph response email:', error);
  }
}

module.exports = {
  sendPreCreationEmail,
  sendPostCreationEmail,
  sendMetaErrorEmail,
  sendApuTirggerEmail,
  sendLeadgenEmail,
  sendPlatFormEmail,
  sendgraphResponseEmail
};