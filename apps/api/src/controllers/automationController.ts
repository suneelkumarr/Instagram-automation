import { Request, Response } from 'express';
import { Automation, InstagramAccount } from '../models/index.js';
import { sendSuccess, sendError, parsePagination } from '../utils/pagination.js';
import { addFlowJob } from '../services/queueService.js';

export const listAutomations = async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = req.workspace?._id.toString();
    const { page, limit, skip } = parsePagination(req.query as Record<string, string>);

    const { status, instagramAccountId, triggerType, sort = 'createdAt', order = 'desc' } = req.query;

    const filter: Record<string, unknown> = { workspaceId };
    if (status) filter.status = status;
    if (instagramAccountId) filter.instagramAccountId = instagramAccountId;
    if (triggerType) filter['trigger.type'] = triggerType;

    const [automations, total] = await Promise.all([
      Automation.find(filter)
        .populate('instagramAccountId', 'username profilePicture')
        .sort({ [sort]: order === 'desc' ? -1 : 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Automation.countDocuments(filter),
    ]);

    sendSuccess(res, automations, 200, { page, limit, total });
  } catch (error) {
    sendError(res, 'Failed to list automations');
  }
};

export const getAutomation = async (req: Request, res: Response): Promise<void> => {
  try {
    const automation = await Automation.findOne({
      _id: req.params.id,
      workspaceId: req.workspace?._id,
    }).populate('instagramAccountId', 'username profilePicture');

    if (!automation) {
      sendError(res, 'Automation not found', 404);
      return;
    }

    sendSuccess(res, automation);
  } catch (error) {
    sendError(res, 'Failed to get automation');
  }
};

export const createAutomation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { instagramAccountId, name, description, trigger, flowData } = req.body;
    const workspaceId = req.workspace?._id.toString();

    // Verify IG account belongs to workspace
    const igAccount = await InstagramAccount.findOne({
      _id: instagramAccountId,
      workspaceId,
    });

    if (!igAccount) {
      sendError(res, 'Instagram account not found', 404);
      return;
    }

    // Check automation limit
    const workspace = req.workspace!;
    if (!workspace.checkUsageLimit('automations')) {
      sendError(res, `Automation limit reached (${workspace.limits.automations}). Upgrade your plan.`, 403);
      return;
    }

    const automation = new Automation({
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

    sendSuccess(res, automation, 201);
  } catch (error) {
    console.error('Create automation error:', error);
    sendError(res, 'Failed to create automation');
  }
};

export const updateAutomation = async (req: Request, res: Response): Promise<void> => {
  try {
    const automation = await Automation.findOne({
      _id: req.params.id,
      workspaceId: req.workspace?._id,
    });

    if (!automation) {
      sendError(res, 'Automation not found', 404);
      return;
    }

    const { name, description, trigger, flowData, status } = req.body;

    if (name !== undefined) automation.name = name;
    if (description !== undefined) automation.description = description;
    if (trigger !== undefined) automation.trigger = trigger;
    if (flowData !== undefined) automation.flowData = flowData;
    if (status !== undefined && status !== automation.status) {
      automation.status = status;
      if (status === 'active') {
        automation.publishedAt = new Date();
      }
    }

    automation.version += 1;
    await automation.save();

    sendSuccess(res, automation);
  } catch (error) {
    sendError(res, 'Failed to update automation');
  }
};

export const deleteAutomation = async (req: Request, res: Response): Promise<void> => {
  try {
    const automation = await Automation.findOneAndDelete({
      _id: req.params.id,
      workspaceId: req.workspace?._id,
    });

    if (!automation) {
      sendError(res, 'Automation not found', 404);
      return;
    }

    sendSuccess(res, { deleted: true });
  } catch (error) {
    sendError(res, 'Failed to delete automation');
  }
};

export const activateAutomation = async (req: Request, res: Response): Promise<void> => {
  try {
    const automation = await Automation.findOne({
      _id: req.params.id,
      workspaceId: req.workspace?._id,
    });

    if (!automation) {
      sendError(res, 'Automation not found', 404);
      return;
    }

    if (automation.status === 'active') {
      sendError(res, 'Automation is already active', 400);
      return;
    }

    await automation.activate();
    sendSuccess(res, automation);
  } catch (error) {
    sendError(res, 'Failed to activate automation');
  }
};

export const pauseAutomation = async (req: Request, res: Response): Promise<void> => {
  try {
    const automation = await Automation.findOne({
      _id: req.params.id,
      workspaceId: req.workspace?._id,
    });

    if (!automation) {
      sendError(res, 'Automation not found', 404);
      return;
    }

    await automation.pause();
    sendSuccess(res, automation);
  } catch (error) {
    sendError(res, 'Failed to pause automation');
  }
};

export const duplicateAutomation = async (req: Request, res: Response): Promise<void> => {
  try {
    const original = await Automation.findOne({
      _id: req.params.id,
      workspaceId: req.workspace?._id,
    });

    if (!original) {
      sendError(res, 'Automation not found', 404);
      return;
    }

    const duplicate = new Automation({
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

    sendSuccess(res, duplicate, 201);
  } catch (error) {
    sendError(res, 'Failed to duplicate automation');
  }
};

export const testAutomation = async (req: Request, res: Response): Promise<void> => {
  try {
    const automation = await Automation.findOne({
      _id: req.params.id,
      workspaceId: req.workspace?._id,
    });

    if (!automation) {
      sendError(res, 'Automation not found', 404);
      return;
    }

    // Execute flow with test data
    const testPayload = req.body.payload || {
      contactId: null,
      message: 'Test message',
      triggerType: automation.trigger.type,
    };

    await addFlowJob({
      workspaceId: req.workspace?._id.toString() || '',
      automationId: automation._id.toString(),
      contactId: testPayload.contactId,
      triggerType: automation.trigger.type,
      triggerPayload: testPayload,
    }, 1); // High priority for tests

    sendSuccess(res, { message: 'Test job queued', jobId: `test-${Date.now()}` });
  } catch (error) {
    sendError(res, 'Failed to test automation');
  }
};

export const getAutomationStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const automation = await Automation.findOne({
      _id: req.params.id,
      workspaceId: req.workspace?._id,
    });

    if (!automation) {
      sendError(res, 'Automation not found', 404);
      return;
    }

    const completionRate = automation.stats.triggered > 0
      ? ((automation.stats.completed / automation.stats.triggered) * 100).toFixed(1)
      : '0';

    const failureRate = automation.stats.triggered > 0
      ? ((automation.stats.failed / automation.stats.triggered) * 100).toFixed(1)
      : '0';

    sendSuccess(res, {
      triggered: automation.stats.triggered,
      completed: automation.stats.completed,
      failed: automation.stats.failed,
      lastTriggeredAt: automation.stats.lastTriggeredAt,
      completionRate,
      failureRate,
      status: automation.status,
    });
  } catch (error) {
    sendError(res, 'Failed to get automation stats');
  }
};
