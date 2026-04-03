"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getContactAnalytics = exports.getAutomationAnalytics = exports.getMessageAnalytics = exports.getOverview = void 0;
const index_js_1 = require("../models/index.js");
const pagination_js_1 = require("../utils/pagination.js");
const mongoose_1 = __importDefault(require("mongoose"));
const getOverview = async (req, res) => {
    try {
        const workspaceId = req.workspace?._id.toString();
        const { days = '7' } = req.query;
        const daysNum = parseInt(days);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysNum);
        // Parallel queries for dashboard metrics
        const [totalContacts, newContacts, totalMessages, messagesThisWeek, activeAutomations, conversations,] = await Promise.all([
            index_js_1.Contact.countDocuments({ workspaceId }),
            index_js_1.Contact.countDocuments({ workspaceId, createdAt: { $gte: startDate } }),
            index_js_1.Message.countDocuments({ workspaceId }),
            index_js_1.Message.countDocuments({ workspaceId, createdAt: { $gte: startDate } }),
            index_js_1.Automation.countDocuments({ workspaceId, status: 'active' }),
            index_js_1.Conversation.aggregate([
                { $match: { workspaceId: new mongoose_1.default.Types.ObjectId(workspaceId) } },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 },
                    },
                },
            ]),
        ]);
        const conversationStats = conversations.reduce((acc, curr) => {
            acc[curr._id] = curr.count;
            return acc;
        }, {});
        // Event counts
        const events = await index_js_1.AnalyticsEvent.aggregate([
            {
                $match: {
                    workspaceId: new mongoose_1.default.Types.ObjectId(workspaceId),
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
        }, {});
        // Growth data (last 7 days)
        const growthData = await index_js_1.Contact.aggregate([
            {
                $match: {
                    workspaceId: new mongoose_1.default.Types.ObjectId(workspaceId),
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
        (0, pagination_js_1.sendSuccess)(res, {
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
    }
    catch (error) {
        console.error('Analytics overview error:', error);
        (0, pagination_js_1.sendError)(res, 'Failed to get analytics');
    }
};
exports.getOverview = getOverview;
const getMessageAnalytics = async (req, res) => {
    try {
        const workspaceId = req.workspace?._id.toString();
        const { days = '30' } = req.query;
        const daysNum = parseInt(days);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysNum);
        const analytics = await index_js_1.Message.aggregate([
            {
                $match: {
                    workspaceId: new mongoose_1.default.Types.ObjectId(workspaceId),
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
        const dailyStats = {};
        for (const item of analytics) {
            const date = item._id.date;
            if (!dailyStats[date]) {
                dailyStats[date] = { inbound: 0, outbound: 0, sent: 0, delivered: 0, read: 0, failed: 0 };
            }
            if (item._id.direction === 'inbound')
                dailyStats[date].inbound += item.count;
            if (item._id.direction === 'outbound')
                dailyStats[date].outbound += item.count;
            if (item._id.status === 'sent')
                dailyStats[date].sent += item.count;
            if (item._id.status === 'delivered')
                dailyStats[date].delivered += item.count;
            if (item._id.status === 'read')
                dailyStats[date].read += item.count;
            if (item._id.status === 'failed')
                dailyStats[date].failed += item.count;
        }
        (0, pagination_js_1.sendSuccess)(res, { dailyStats, total: analytics.length });
    }
    catch (error) {
        (0, pagination_js_1.sendError)(res, 'Failed to get message analytics');
    }
};
exports.getMessageAnalytics = getMessageAnalytics;
const getAutomationAnalytics = async (req, res) => {
    try {
        const workspaceId = req.workspace?._id.toString();
        const automations = await index_js_1.Automation.find({ workspaceId })
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
        (0, pagination_js_1.sendSuccess)(res, { automations: performance });
    }
    catch (error) {
        (0, pagination_js_1.sendError)(res, 'Failed to get automation analytics');
    }
};
exports.getAutomationAnalytics = getAutomationAnalytics;
const getContactAnalytics = async (req, res) => {
    try {
        const workspaceId = req.workspace?._id.toString();
        const [stageDistribution, sourceDistribution, tagDistribution, scoreDistribution,] = await Promise.all([
            // Stage distribution
            index_js_1.Contact.aggregate([
                { $match: { workspaceId: new mongoose_1.default.Types.ObjectId(workspaceId) } },
                { $group: { _id: '$conversationStage', count: { $sum: 1 } } },
            ]),
            // Source distribution
            index_js_1.Contact.aggregate([
                { $match: { workspaceId: new mongoose_1.default.Types.ObjectId(workspaceId) } },
                { $group: { _id: '$source', count: { $sum: 1 } } },
            ]),
            // Top tags
            index_js_1.Contact.aggregate([
                { $match: { workspaceId: new mongoose_1.default.Types.ObjectId(workspaceId), tags: { $exists: true, $ne: [] } } },
                { $unwind: '$tags' },
                { $group: { _id: '$tags', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 },
            ]),
            // Lead score distribution
            index_js_1.Contact.aggregate([
                { $match: { workspaceId: new mongoose_1.default.Types.ObjectId(workspaceId) } },
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
        (0, pagination_js_1.sendSuccess)(res, {
            stageDistribution,
            sourceDistribution,
            topTags: tagDistribution,
            scoreDistribution,
        });
    }
    catch (error) {
        (0, pagination_js_1.sendError)(res, 'Failed to get contact analytics');
    }
};
exports.getContactAnalytics = getContactAnalytics;
//# sourceMappingURL=analyticsController.js.map