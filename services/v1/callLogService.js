const CallLog = require('../../models/CallLog');

class CallLogService {
  async getAll(page, limit, filters) {
    const { startDate, endDate, userId, search } = filters;
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
    if (search) filter.$or = [{ callId: { $regex: search, $options: 'i' } }];

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      CallLog.find(filter)
        .populate('userId', 'name email')
        .populate('leadId', 'name contactNumber')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      CallLog.countDocuments(filter)
    ]);

    return { data, total, page, pages: Math.ceil(total / limit), limit };
  }
}

module.exports = new CallLogService();
