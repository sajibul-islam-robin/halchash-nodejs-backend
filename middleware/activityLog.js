import { ActivityLog } from '../models/halchash_models.js';

export const logActivity = async (req, res, next) => {
  // Store original json method
  const originalJson = res.json.bind(res);

  // Override json method to capture response
  res.json = function(data) {
    // Log activity after response is sent
    if (req.admin && req.method !== 'GET') {
      const activityData = {
        admin_id: req.admin._id,
        action: `${req.method} ${req.path}`,
        details: {
          method: req.method,
          path: req.path,
          body: req.body,
          params: req.params,
          query: req.query,
          response: data
        },
        ip_address: req.ip || req.connection.remoteAddress,
        user_agent: req.get('user-agent')
      };

      // Don't await - log asynchronously
      ActivityLog.create(activityData).catch(err => {
        console.error('Activity log error:', err);
      });
    }

    return originalJson(data);
  };

  next();
};

