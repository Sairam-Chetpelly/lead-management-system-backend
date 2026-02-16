const Lead = require('../../models/Lead');
const LeadActivity = require('../../models/LeadActivity');

class LeadService {
  async delete(id) {
    let leadActivity = await LeadActivity.findById(id);
    let actualLeadId = null;

    if (leadActivity) {
      actualLeadId = leadActivity.leadId;
    } else {
      const lead = await Lead.findById(id);
      if (lead) {
        actualLeadId = lead._id;
        leadActivity = await LeadActivity.findOne({ leadId: actualLeadId, deletedAt: null });
      }
    }

    if (!leadActivity || leadActivity.deletedAt) {
      throw { statusCode: 404, message: 'Lead not found' };
    }

    await LeadActivity.updateMany(
      { leadId: actualLeadId, deletedAt: null },
      { deletedAt: new Date() }
    );

    await Lead.findByIdAndUpdate(actualLeadId, { deletedAt: new Date() });

    return { message: 'Lead deleted successfully' };
  }
}

module.exports = new LeadService();
