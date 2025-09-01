const mongoose = require('mongoose');

const googleAdsHistorySchema = new mongoose.Schema({
  lead_id: {
    type: String,
    required: true
  },
  user_column_data: [{
    column_name: String,
    string_value: String,
    column_id: String
  }],
  api_version: String,
  form_id: Number,
  campaign_id: Number,
  google_key: String,
  is_test: Boolean,
  gcl_id: String,
  adgroup_id: Number,
  creative_id: Number,
  processed: {
    type: Boolean,
    default: false
  },
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: false
  },
  error: String
}, {
  timestamps: true
});

module.exports = mongoose.model('GoogleAdsHistory', googleAdsHistorySchema);