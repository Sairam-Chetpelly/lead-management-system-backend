const axios = require('axios');

class WhatsAppService {
  constructor() {
    this.msg91ApiKey = process.env.MSG91_API_KEY;
    this.msg91BaseUrl = 'https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/';
  }

  async sendLeadAssignmentNotification(salesAgent, lead) {
    try {
      if (!salesAgent.mobileNumber) {
        console.log('Sales agent mobile number not found');
        return false;
      }
      console.log('Sales agent mobile number:', salesAgent.mobileNumber);

      const payload = {
        integrated_number: process.env.MSG91_WHATSAPP_NUMBER || '919901309003',
        content_type: 'template',
        payload: {
          messaging_product: 'whatsapp',
          type: 'template',
          template: {
            name: 'leadassignement',
            language: {
              code: 'en',
              policy: 'deterministic'
            },
            namespace: process.env.MSG91_TEMPLATE_NAMESPACE || 'ca8ac541_4455_4e02_aa5a_eac98132f9b7',
            to_and_components: [
              {
                to: [`91${salesAgent.mobileNumber}`],
                components: {
                  body_1: {
                    type: 'text',
                    value: lead.leadID || 'N/A'
                  },
                  body_2: {
                    type: 'text',
                    value: lead.name || 'N/A'
                  },
                  body_3: {
                    type: 'text',
                    value: lead.sourceId?.name || 'N/A'
                  },
                  body_4: {
                    type: 'text',
                    value: (lead.comment || 'N/A').replace(/[\n\r]+/g, ' ').trim()
                  }
                }
              }
            ]
          }
        }
      };

      const response = await axios.post(
        `${this.msg91BaseUrl}`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'authkey': this.msg91ApiKey
          }
        }
      );

      console.log('WhatsApp template notification sent successfully:', response.data);
      return true;

    } catch (error) {
      console.error('Error sending WhatsApp notification:', error.response?.data || error.message);
      return false;
    }
  }

  async sendBulkNotification(recipients, message) {
    try {
      const promises = recipients.map(recipient => {
        let mobileNumber = recipient.mobileNumber.replace(/[^\d]/g, '');
        if (mobileNumber.startsWith('91') && mobileNumber.length === 12) {
          mobileNumber = mobileNumber.slice(2);
        }
        
        if (mobileNumber.length !== 10) {
          console.log('Invalid mobile number format:', recipient.mobileNumber);
          return Promise.resolve(false);
        }

        const payload = {
          integrated_number: process.env.MSG91_WHATSAPP_NUMBER || '917757915697',
          content_type: 'text',
          payload: {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: `91${mobileNumber}`,
            type: 'text',
            text: {
              body: message.replace(/[\n\r]+/g, ' ').trim()
            }
          }
        };

        return axios.post(
          `${this.msg91BaseUrl}`,
          payload,
          {
            headers: {
              'Content-Type': 'application/json',
              'authkey': this.msg91ApiKey
            }
          }
        );
      });

      const results = await Promise.allSettled(promises);
      const successful = results.filter(result => result.status === 'fulfilled').length;
      
      console.log(`Bulk WhatsApp notifications: ${successful}/${recipients.length} sent successfully`);
      return successful;

    } catch (error) {
      console.error('Error sending bulk WhatsApp notifications:', error);
      return 0;
    }
  }
}

module.exports = new WhatsAppService();