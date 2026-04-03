"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAutomationStats = exports.testAutomation = exports.duplicateAutomation = exports.pauseAutomation = exports.activateAutomation = exports.deleteAutomation = exports.updateAutomation = exports.createAutomation = exports.getAutomation = exports.listAutomations = void 0;
const index_js_1 = require("../models/index.js");
const pagination_js_1 = require("../utils/pagination.js");
const queueService_js_1 = require("../services/queueService.js");
const listAutomations = async (req, res) => {
    try {
        const workspaceId = req.workspace?._id.toString();
        const { page, limit, skip } = (0, pagination_js_1.parsePagination)(req.query);
        const { status, instagramAccountId, triggerType, sort = 'createdAt', order = 'desc' } = req.query;
        const filter = { workspaceId };
        if (status)
            filter.status = status;
        if (instagramAccountId)
            filter.instagramAccountId = instagramAccountId;
        if (triggerType)
            filter['trigger.type'] = triggerType;
        const [automations, total] = await Promise.all([
            index_js_1.Automation.find(filter)
                .populate('instagramAccountId', 'username profilePicture')
                .sort({ [sort]: order === 'desc' ? -1 : 1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            index_js_1.Automation.countDocuments(filter),
        ]);
        (0, pagination_js_1.sendSuccess)(res, automations, 200, { page, limit, total });
    }
    catch (error) {
        (0, pagination_js_1.sendError)(res, 'Failed to list automations');
    }
};
exports.listAutomations = listAutomations;
const getAutomation = async (req, res) => {
    try {
        const automation = await index_js_1.Automation.findOne({
            _id: req.params.id,
            workspaceId: req.workspace?._id,
        }).populate('instagramAccountId', 'username profilePicture');
        if (!automation) {
            (0, pagination_js_1.sendError)(res, 'Automation not found', 404);
            return;
        }
        (0, pagination_js_1.sendSuccess)(res, automation);
    }
    catch (error) {
        (0, pagination_js_1.sendError)(res, 'Failed to get automation');
    }
};
exports.getAutomation = getAutomation;
const createAutomation = async (req, res) => {
    try {
        const { instagramAccountId, name, description, trigger, flowData } = req.body;
        const workspaceId = req.workspace?._id.toString();
        // Verify IG account belongs to workspace
        const igAccount = await index_js_1.InstagramAccount.findOne({
            _id: instagramAccountId,
            workspaceId,
        });
        if (!igAccount) {
            (0, pagination_js_1.sendError)(res, 'Instagram account not found', 404);
            return;
        }
        // Check automation limit
        const workspace = req.workspace;
        if (!workspace.checkUsageLimit('automations')) {
            (0, pagination_js_1.sendError)(res, `Automation limit reached (${workspace.limits.automations}). Upgrade your plan.`, 403);
            return;
        }
        const automation = new index_js_1.Automation({
            workspaceId,
            instagramAccountId,
            name,
            description,
            trigger,
            flowData: flowData || { nodes: [], edges: [] },
            status: 'draft',
            createdBy: req.user?._id,
        });
        await automation.save();
        await workspace.incrementUsage('automations');
        (0, pagination_js_1.sendSuccess)(res, automation, 201);
    }
    catch (error) {
        console.error('Create automation error:', error);
        (0, pagination_js_1.sendError)(res, 'Failed to create automation');
    }
};
exports.createAutomation = createAutomation;
const updateAutomation = async (req, res) => {
    try {
        const automation = await index_js_1.Automation.findOne({
            _id: req.params.id,
            workspaceId: req.workspace?._id,
        });
        if (!automation) {
            (0, pagination_js_1.sendError)(res, 'Automation not found', 404);
            return;
        }
        const { name, description, trigger, flowData, status } = req.body;
        if (name !== undefined)
            automation.name = name;
        if (description !== undefined)
            automation.description = description;
        if (trigger !== undefined)
            automation.trigger = trigger;
        if (flowData !== undefined)
            automation.flowData = flowData;
        if (status !== undefined && status !== automation.status) {
            automation.status = status;
            if (status === 'active') {
                automation.publishedAt = new Date();
            }
        }
        automation.version += 1;
        await automation.save();
        (0, pagination_js_1.sendSuccess)(res, automation);
    }
    catch (error) {
        (0, pagination_js_1.sendError)(res, 'Failed to update automation');
    }
};
exports.updateAutomation = updateAutomation;
const deleteAutomation = async (req, res) => {
    try {
        const automation = await index_js_1.Automation.findOneAndDelete({
            _id: req.params.id,
            workspaceId: req.workspace?._id,
        });
        if (!automation) {
            (0, pagination_js_1.sendError)(res, 'Automation not found', 404);
            return;
        }
        (0, pagination_js_1.sendSuccess)(res, { deleted: true });
    }
    catch (error) {
        (0, pagination_js_1.sendError)(res, 'Failed to delete automation');
    }
};
exports.deleteAutomation = deleteAutomation;
const activateAutomation = async (req, res) => {
    try {
        const automation = await index_js_1.Automation.findOne({
            _id: req.params.id,
            workspaceId: req.workspace?._id,
        });
        if (!automation) {
            (0, pagination_js_1.sendError)(res, 'Automation not found', 404);
            return;
        }
        if (automation.status === 'active') {
            (0, pagination_js_1.sendError)(res, 'Automation is already active', 400);
            return;
        }
        await automation.activate();
        (0, pagination_js_1.sendSuccess)(res, automation);
    }
    catch (error) {
        (0, pagination_js_1.sendError)(res, 'Failed to activate automation');
    }
};
exports.activateAutomation = activateAutomation;
const pauseAutomation = async (req, res) => {
    try {
        const automation = await index_js_1.Automation.findOne({
            _id: req.params.id,
            workspaceId: req.workspace?._id,
        });
        if (!automation) {
            (0, pagination_js_1.sendError)(res, 'Automation not found', 404);
            return;
        }
        await automation.pause();
        (0, pagination_js_1.sendSuccess)(res, automation);
    }
    catch (error) {
        (0, pagination_js_1.sendError)(res, 'Failed to pause automation');
    }
};
exports.pauseAutomation = pauseAutomation;
const duplicateAutomation = async (req, res) => {
    try {
        const original = await index_js_1.Automation.findOne({
            _id: req.params.id,
            workspaceId: req.workspace?._id,
        });
        if (!original) {
            (0, pagination_js_1.sendError)(res, 'Automation not found', 404);
            return;
        }
        const duplicate = new index_js_1.Automation({
            workspaceId: original.workspaceId,
            instagramAccountId: original.instagramAccountId,
            name: `${original.name} (Copy)`,
            description: original.description,
            trigger: original.trigger,
            flowData: original.flowData,
            status: 'draft',
            createdBy: req.user?._id,
        });
        await duplicate.save();
        (0, pagination_js_1.sendSuccess)(res, duplicate, 201);
    }
    catch (error) {
        (0, pagination_js_1.sendError)(res, 'Failed to duplicate automation');
    }
};
exports.duplicateAutomation = duplicateAutomation;
const testAutomation = async (req, res) => {
    try {
        const automation = await index_js_1.Automation.findOne({
            _id: req.params.id,
            workspaceId: req.workspace?._id,
        });
        if (!automation) {
            (0, pagination_js_1.sendError)(res, 'Automation not found', 404);
            return;
        }
        // Execute flow with test data
        const testPayload = req.body.payload || {
            contactId: null,
            message: 'Test message',
            triggerType: automation.trigger.type,
        };
        await (0, queueService_js_1.addFlowJob)({
            workspaceId: req.workspace?._id.toString() || '',
            automationId: automation._id.toString(),
            contactId: testPayload.contactId,
            triggerType: automation.trigger.type,
            triggerPayload: testPayload,
        }, 1); // High priority for tests
        (0, pagination_js_1.sendSuccess)(res, { message: 'Test job queued', jobId: `test-${Date.now()}` });
    }
    catch (error) {
        (0, pagination_js_1.sendError)(res, 'Failed to test automation');
    }
};
exports.testAutomation = testAutomation;
const getAutomationStats = async (req, res) => {
    try {
        const automation = await index_js_1.Automation.findOne({
            _id: req.params.id,
            workspaceId: req.workspace?._id,
        });
        if (!automation) {
            (0, pagination_js_1.sendError)(res, 'Automation not found', 404);
            return;
        }
        const completionRate = automation.stats.triggered > 0
            ? ((automation.stats.completed / automation.stats.triggered) * 100).toFixed(1)
            : '0';
        const failureRate = automation.stats.triggered > 0
            ? ((automation.stats.failed / automation.stats.triggered) * 100).toFixed(1)
            : '0';
        (0, pagination_js_1.sendSuccess)(res, {
            triggered: automation.stats.triggered,
            completed: automation.stats.completed,
            failed: automation.stats.failed,
            lastTriggeredAt: automation.stats.lastTriggeredAt,
            completionRate,
            failureRate,
            status: automation.status,
        });
    }
    catch (error) {
        (0, pagination_js_1.sendError)(res, 'Failed to get automation stats');
    }
};
exports.getAutomationStats = getAutomationStats;
//# sourceMappingURL=automationController.js.map