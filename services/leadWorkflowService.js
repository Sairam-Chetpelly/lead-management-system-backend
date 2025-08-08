const User = require('../models/User');
const Lead = require('../models/Lead');
const Status = require('../models/Status');
const LeadActivity = require('../models/LeadActivity');
const Role = require('../models/Role');

class LeadWorkflowService {
  // Round robin assignment for teams
  static async assignToTeam(teamType, centerId = null, languageId = null, leadValue = null) {
    const query = { deletedAt: null };

    // Get role IDs for team types
    let roleNames = [];
    if (teamType === 'pre_sales') {
      roleNames = ['Pre-Sales Executive', 'Pre-Sales Manager'];
    } else if (teamType === 'sales') {
      roleNames = ['Sales Executive', 'Sales Manager'];
    }

    const roles = await Role.find({ name: { $in: roleNames }, deletedAt: null });
    const roleIds = roles.map(role => role._id);
    
    query.roleId = { $in: roleIds };

    // Add filters
    if (centerId) query.centreId = centerId;
    if (languageId) query.languageIds = languageId;
    if (leadValue && teamType === 'sales') {
      query.qualification = leadValue === 'high value' ? 'high_value' : 'low_value';
    }

    const users = await User.find(query).sort({ updatedAt: 1 });
    
    if (users.length === 0) {
      throw new Error(`No available ${teamType} users found`);
    }

    // Round robin - get first user and update timestamp
    const assignedUser = users[0];
    await User.findByIdAndUpdate(assignedUser._id, { updatedAt: new Date() });
    
    return assignedUser;
  }

  // Create lead activity log
  static async createActivity(leadId, updatedBy, notes, additionalData = {}) {
    const lead = await Lead.findById(leadId);
    
    const activity = new LeadActivity({
      leadId: leadId,
      name: lead.name,
      email: lead.email,
      contactNumber: lead.contactNumber,
      sourceId: lead.sourceId,
      presalesUserId: lead.presalesUserId,
      salesUserId: lead.salesUserId,
      leadStatusId: lead.leadStatusId,
      centerId: lead.centerId,
      languageId: lead.languageId,
      updatedPerson: updatedBy,
      notes: notes,
      ...additionalData
    });
    
    await activity.save();
    return activity;
  }

  // 1. Initial lead creation and assignment
  static async createAndAssignLead(leadData, assignmentType, updatedBy) {
    // Create lead
    const lead = new Lead({
      ...leadData,
      assignmentType,
      currentStage: 'lead_generation'
    });

    // Initial assignment logic
    if (assignmentType === 'manual_upload') {
      // Manual decision to assign to pre-sales or sales
      if (leadData.assignTo === 'sales') {
        const salesUser = await this.assignToTeam('sales', leadData.centerId, leadData.languageId, leadData.leadValue);
        lead.salesUserId = salesUser._id;
        lead.currentStage = 'sales';
      } else {
        const preSalesUser = await this.assignToTeam('pre_sales', leadData.centerId, leadData.languageId);
        lead.presalesUserId = preSalesUser._id;
        lead.currentStage = 'pre_sales';
      }
    } else {
      // API integration - auto assign to pre-sales
      const preSalesUser = await this.assignToTeam('pre_sales');
      lead.presalesUserId = preSalesUser._id;
      lead.currentStage = 'pre_sales';
    }

    await lead.save();
    await this.createActivity(lead._id, updatedBy, `Lead created via ${assignmentType}`);
    
    return lead;
  }

  // 2. Pre-sales language evaluation
  static async evaluateLanguageComfort(leadId, isComfortable, languageId, centerId, leadValue, updatedBy) {
    const lead = await Lead.findById(leadId);

    if (!isComfortable) {
      // Reassign to appropriate pre-sales person
      const newPreSales = await this.assignToTeam('pre_sales', centerId, languageId);
      
      await Lead.findByIdAndUpdate(leadId, {
        presalesUserId: newPreSales._id,
        languageId: languageId,
        centerId: centerId
      });

      await this.createActivity(leadId, updatedBy, 'Reassigned due to language preference');
      return { reassigned: true, newPreSales };
    }

    // Update lead with evaluation results
    await Lead.findByIdAndUpdate(leadId, {
      languageId: languageId,
      leadValue: leadValue,
      centerId: centerId
    });

    await this.createActivity(leadId, updatedBy, 'Language evaluation completed', {
      languageId,
      leadValue,
      centerId
    });

    return { reassigned: false };
  }

  // 3. Qualification check
  static async qualifyLead(leadId, isQualified, updatedBy) {
    if (!isQualified) {
      // Mark as lost
      const lostStatus = await Status.findOne({ slug: 'lost', type: 'leadStatus' });
      
      await Lead.findByIdAndUpdate(leadId, {
        leadStatusId: lostStatus._id,
        outcome: 'lost',
        currentStage: 'completed'
      });

      await this.createActivity(leadId, updatedBy, 'Lead marked as lost - not qualified');
      return { qualified: false };
    }

    // Assign to sales team based on criteria
    const lead = await Lead.findById(leadId);
    const salesUser = await this.assignToTeam('sales', lead.centerId, lead.languageId, lead.leadValue);
    
    const qualifiedStatus = await Status.findOne({ slug: 'qualified-hot', type: 'leadStatus' });
    
    await Lead.findByIdAndUpdate(leadId, {
      salesUserId: salesUser._id,
      leadStatusId: qualifiedStatus._id,
      isQualified: true,
      currentStage: 'qualified_hot'
    });

    await this.createActivity(leadId, updatedBy, 'Lead qualified and assigned to sales');
    return { qualified: true, salesUser };
  }

  // 4. Site visit process
  static async processSiteVisit(leadId, siteVisit, siteVisitDate, updatedBy) {
    await Lead.findByIdAndUpdate(leadId, {
      siteVisitScheduled: siteVisit,
      siteVisitCompleted: siteVisit && siteVisitDate <= new Date()
    });

    await this.createActivity(leadId, updatedBy, 
      siteVisit ? 'Site visit scheduled' : 'Site visit not scheduled', 
      { siteVisit, siteVisitDate }
    );
  }

  // 5. Selection centre process
  static async processSelectionCentre(leadId, centerVisit, centerVisitDate, virtualMeeting, virtualMeetingDate, updatedBy) {
    await Lead.findByIdAndUpdate(leadId, {
      selectionCentre: centerVisit,
      virtualMeetingScheduled: centerVisit && virtualMeeting
    });

    let notes = centerVisit ? 'Selected for centre visit' : 'Not selected for centre';
    if (centerVisit && virtualMeeting) {
      notes += ' - Virtual meeting scheduled';
    }

    await this.createActivity(leadId, updatedBy, notes, {
      centerVisit,
      centerVisitDate,
      virtualMeeting,
      virtualMeetingDate
    });

    // If not selected, mark for cold call future
    if (!centerVisit) {
      await Lead.findByIdAndUpdate(leadId, { outcome: 'cold_call_future' });
    }
  }

  // 6. Final outcome
  static async processFinalOutcome(leadId, outcome, updatedBy) {
    let statusSlug = outcome === 'won' ? 'won' : 'lost';
    const finalStatus = await Status.findOne({ slug: statusSlug, type: 'leadStatus' });
    
    await Lead.findByIdAndUpdate(leadId, {
      outcome,
      leadStatusId: finalStatus._id,
      currentStage: 'completed'
    });

    await this.createActivity(leadId, updatedBy, `Lead outcome: ${outcome}`, {
      isCompleted: true,
      isCompletedDate: new Date()
    });
  }

  // Get workflow status
  static async getWorkflowStatus(leadId) {
    const lead = await Lead.findById(leadId)
      .populate('presalesUserId', 'name')
      .populate('salesUserId', 'name')
      .populate('leadStatusId', 'name')
      .populate('languageId', 'name')
      .populate('centerId', 'name');

    const activities = await LeadActivity.find({ leadId, deletedAt: null })
      .populate('updatedPerson', 'name')
      .sort({ createdAt: -1 })
      .limit(10);

    return { lead, activities };
  }
}

module.exports = LeadWorkflowService;