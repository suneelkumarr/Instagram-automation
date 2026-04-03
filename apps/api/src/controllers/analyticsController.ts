import { Request, Response } from 'express';
import { AnalyticsEvent, Message, Contact, Automation, Conversation } from '../models/index.js';
import { sendSuccess, sendError } from '../utils/pagination.js';
import mongoose from 'mongoose';

export const getOverview = async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = req.workspace?._id.toString();
    const { days = '7' } = req.query;
    const daysNum = parseInt(days as string);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);

    // Parallel queries for dashboard metrics
    const [
      totalContacts,
      newContacts,
      totalMessages,
      messagesThisWeek,
      activeAutomations,
      conversations,
    ] = await Promise.all([
      Contact.countDocuments({ workspaceId }),
      Contact.countDocuments({ workspaceId, createdAt: { $gte: startDate } }),
      Message.countDocuments({ workspaceId }),
      Message.countDocuments({ workspaceId, createdAt: { $gte: startDate } }),
      Automation.countDocuments({ workspaceId, status: 'active' }),
      Conversation.aggregate([
        { $match: { workspaceId: new mongoose.Types.ObjectId(workspaceId) } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const conversationStats = conversations.reduce((acc, curr) => {
      acc[curr._id as string] = curr.count;
      return acc;
    }, {} as Record<string, number>);

    // Event counts
    const events = await AnalyticsEvent.aggregate([
      {
        $match: {
          workspaceId: new mongoose.Types.ObjectId(workspaceId),
          timestamp: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: '$event',
          count: { $sum: 1 },
        },
      },
    ]);

    const eventStats = events.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {} as Record<string, number>);

    // Growth data (last 7 days)
    const growthData = await Contact.aggregate([
      {
        $match: {
          workspaceId: new mongoose.Types.ObjectId(workspaceId),
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 30 },
    ]);

    sendSuccess(res, {
      overview: {
        totalContacts,
        newContacts,
        totalMessages,
        messagesThisWeek,
        activeAutomations,
      },
      conversations: conversationStats,
      events: eventStats,
      growthData,
    });
  } catch (error) {
    console.error('Analytics overview error:', error);
    sendError(res, 'Failed to get analytics');
  }
};

export const getMessageAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = req.workspace?._id.toString();
    const { days = '30' } = req.query;
    const daysNum = parseInt(days as string);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);

    const analytics = await Message.aggregate([
      {
        $match: {
          workspaceId: new mongoose.Types.ObjectId(workspaceId),
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            direction: '$direction',
            status: '$status',
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.date': 1 } },
    ]);

    // Reformat for frontend charts
    const dailyStats: Record<string, { inbound: number; outbound: number; sent: number; delivered: number; read: number; failed: number }> = {};

    for (const item of analytics) {
      const date = item._id.date;
      if (!dailyStats[date]) {
        dailyStats[date] = { inbound: 0, outbound: 0, sent: 0, delivered: 0, read: 0, failed: 0 };
      }
      if (item._id.direction === 'inbound') dailyStats[date].inbound += item.count;
      if (item._id.direction === 'outbound') dailyStats[date].outbound += item.count;
      if (item._id.status === 'sent') dailyStats[date].sent += item.count;
      if (item._id.status === 'delivered') dailyStats[date].delivered += item.count;
      if (item._id.status === 'read') dailyStats[date].read += item.count;
      if (item._id.status === 'failed') dailyStats[date].failed += item.count;
    }

    sendSuccess(res, { dailyStats, total: analytics.length });
  } catch (error) {
    sendError(res, 'Failed to get message analytics');
  }
};

export const getAutomationAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = req.workspace?._id.toString();

    const automations = await Automation.find({ workspaceId })
      .select('name status trigger.type stats triggeredAt createdAt')
      .sort({ 'stats.triggered': -1 })
      .limit(20)
      .lean();

    const performance = automations.map((a) => ({
      name: a.name,
      status: a.status,
      triggerType: a.trigger.type,
      triggered: a.stats.triggered,
      completed: a.stats.completed,
      failed: a.stats.failed,
      lastTriggered: a.stats.lastTriggeredAt,
      successRate: a.stats.triggered > 0
        ? ((a.stats.completed / a.stats.triggered) * 100).toFixed(1)
        : '0',
    }));

    sendSuccess(res, { automations: performance });
  } catch (error) {
    sendError(res, 'Failed to get automation analytics');
  }
};

export const getContactAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = req.workspace?._id.toString();

    const [
      stageDistribution,
      sourceDistribution,
      tagDistribution,
      scoreDistribution,
    ] = await Promise.all([
      // Stage distribution
      Contact.aggregate([
        { $match: { workspaceId: new mongoose.Types.ObjectId(workspaceId) } },
        { $group: { _id: '$conversationStage', count: { $sum: 1 } } },
      ]),

      // Source distribution
      Contact.aggregate([
        { $match: { workspaceId: new mongoose.Types.ObjectId(workspaceId) } },
        { $group: { _id: '$source', count: { $sum: 1 } } },
      ]),

      // Top tags
      Contact.aggregate([
        { $match: { workspaceId: new mongoose.Types.ObjectId(workspaceId), tags: { $exists: true, $ne: [] } } },
        { $unwind: '$tags' },
        { $group: { _id: '$tags', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),

      // Lead score distribution
      Contact.aggregate([
        { $match: { workspaceId: new mongoose.Types.ObjectId(workspaceId) } },
        {
          $bucket: {
            groupBy: '$leadScore',
            boundaries: [0, 20, 40, 60, 80, 101],
            default: 'Other',
            output: { count: { $sum: 1 } },
          },
        },
      ]),
    ]);

    sendSuccess(res, {
      stageDistribution,
      sourceDistribution,
      topTags: tagDistribution,
      scoreDistribution,
    });
  } catch (error) {
    sendError(res, 'Failed to get contact analytics');
  }
};
