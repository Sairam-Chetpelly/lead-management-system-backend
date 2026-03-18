const cron = require('node-cron');
const Lead = require('../models/Lead');
const Status = require('../models/Status');

class CronService {
  static async updateCifToHot() {
    try {
      console.log('Running CIF to HOT status update cron job...');
      
      // Get lead and qualified status IDs
      const qualifiedStatus = await Status.findOne({ slug: 'qualified', type: 'leadStatus' });
      const cifSubStatus = await Status.findOne({ slug: 'cif', type: 'leadSubStatus' });
      const hotSubStatus = await Status.findOne({ slug: 'hot', type: 'leadSubStatus' });
      
      if (!qualifiedStatus || !cifSubStatus || !hotSubStatus) {
        console.error('Required statuses not found in database');
        return;
      }
      
      const currentDateTime = new Date();
      
      // Find leads with lead or qualified status, CIF substatus, and cifDate that has passed
      const leadsToUpdate = await Lead.find({
        $and: [
          {
            $or: [
              { leadStatusId: qualifiedStatus._id }
            ]
          },
          { leadSubStatusId: cifSubStatus._id },
          { cifDate: { $ne: null, $ne: '' } },
          { deletedAt: null }
        ]
      });
      
      let updatedCount = 0;
      
      for (const lead of leadsToUpdate) {
        try {
          let cifDateTime = null;
          
          // Handle string cifDate - try multiple parsing methods
          if (typeof lead.cifDate === 'string' && lead.cifDate.trim() !== '') {
            // Try parsing as ISO string first
            cifDateTime = new Date(lead.cifDate);
            
            // If invalid, try parsing common date formats
            if (isNaN(cifDateTime.getTime())) {
              // Try DD/MM/YYYY HH:mm format
              const dateMatch = lead.cifDate.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s*(\d{1,2}):(\d{2})/);
              if (dateMatch) {
                const [, day, month, year, hour, minute] = dateMatch;
                cifDateTime = new Date(year, month - 1, day, hour, minute);
              }
              
              // Try YYYY-MM-DD HH:mm format
              if (isNaN(cifDateTime.getTime())) {
                const isoMatch = lead.cifDate.match(/(\d{4})-(\d{1,2})-(\d{1,2})\s*(\d{1,2}):(\d{2})/);
                if (isoMatch) {
                  const [, year, month, day, hour, minute] = isoMatch;
                  cifDateTime = new Date(year, month - 1, day, hour, minute);
                }
              }
            }
          }
          
          // Check if cifDate is valid and has passed current time
          if (cifDateTime && !isNaN(cifDateTime.getTime()) && cifDateTime <= currentDateTime) {
            // Update lead substatus to HOT
            await Lead.findByIdAndUpdate(lead._id, {
              leadSubStatusId: hotSubStatus._id,
              hotDate: currentDateTime
            });
            
            updatedCount++;
            console.log(`Updated lead ${lead.leadID} from CIF to HOT (CIF Date: ${lead.cifDate})`);
          } else if (cifDateTime && isNaN(cifDateTime.getTime())) {
            console.warn(`Invalid cifDate format for lead ${lead.leadID}: ${lead.cifDate}`);
          }
        } catch (error) {
          console.error(`Error updating lead ${lead.leadID}:`, error);
        }
      }
      
      console.log(`CIF to HOT update completed. Updated ${updatedCount} leads.`);
      
    } catch (error) {
      console.error('Error in CIF to HOT cron job:', error);
    }
  }
  
  static startCronJobs() {
    // Run every 30 minutes
    cron.schedule('*/30 * * * *', () => {
      this.updateCifToHot();
    });
    
    console.log('CIF to HOT cron job scheduled to run every 30 minutes');
  }
}

module.exports = CronService;