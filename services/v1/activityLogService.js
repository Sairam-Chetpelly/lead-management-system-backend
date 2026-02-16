const ActivityLog = require('../../models/ActivityLog');

class ActivityLogService {
  async getAll(page, limit, filters) {
    const { startDate, endDate, userId, type, search } = filters;
    const filter = { deletedAt: null };

    if (startDate && endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.createdAt = { $gte: new Date(startDate), $lte: end };
    } else if (startDate) {
      filter.createdAt = { $gte: new Date(startDate) };
    } else if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.createdAt = { $lte: end };
    }

    if (userId) filter.userId = userId;
    if (type) filter.type = type;
    if (search) filter.$or = [{ comment: { $regex: search, $options: 'i' } }];

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      ActivityLog.find(filter)
        .populate('userId', 'name email')
        .populate('leadId', 'leadID name contactNumber')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      ActivityLog.countDocuments(filter)
    ]);

    return { data, total, page, pages: Math.ceil(total / limit), limit };
  }
}

module.exports = new ActivityLogService();
