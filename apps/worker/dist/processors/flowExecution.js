"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFlowExecutionWorker = void 0;
const bullmq_1 = require("bullmq");
const queues_js_1 = require("../queues/queues.js");
const connection_js_1 = __importDefault(require("../queues/connection.js"));
const index_js_1 = require("../models/index.js");
const MAX_STEPS = 50;
const createFlowExecutionWorker = () => {
    const worker = new bullmq_1.Worker(queues_js_1.QUEUE_NAMES.FLOW_EXECUTION, async (job) => {
        const { workspaceId, automationId, contactId, conversationId, triggerType, triggerPayload } = job.data;
        // Load automation
        const automation = await index_js_1.Automation.findOne({ _id: automationId, status: 'active' });
        if (!automation) {
            throw new Error('Automation not found or not active');
        }
        // Create execution record
        const execution = new index_js_1.FlowExecution({
            workspaceId,
            automationId,
            contactId,
            conversationId,
            triggerType,
            triggerPayload,
            currentNodeId: '',
            executionPath: [],
            context: triggerPayload,
            status: 'running',
        });
        await execution.save();
        const { nodes, edges } = automation.flowData;
        let currentNodeId = nodes.find((n) => n.type === 'trigger')?.id || '';
        let stepCount = 0;
        let error;
        try {
            while (currentNodeId && stepCount < MAX_STEPS) {
                stepCount++;
                execution.executionPath.push(currentNodeId);
                const node = nodes.find((n) => n.id === currentNodeId);
                if (!node) {
                    error = `Node ${currentNodeId} not found`;
                    break;
                }
                execution.currentNodeId = currentNodeId;
                const nodeType = node.type;
                const nodeData = node.data;
                // Process node
                switch (nodeType) {
                    case 'trigger': {
                        // Validate trigger matches
                        const triggerConfig = automation.trigger.config;
                        if (!validateTrigger(triggerType, triggerPayload, triggerConfig)) {
                            error = 'Trigger condition not met';
                        }
                        break;
                    }
                    case 'message': {
                        // Get contact to get recipientId (Instagram user ID)
                        const contact = await index_js_1.Contact.findById(contactId);
                        const recipientId = contact?.igUserId || contact?.username || '';
                        // Resolve message content with variables from context
                        let messageContent = nodeData.content || '';
                        let mediaUrl = nodeData.mediaUrl || '';
                        // Variable substitution from execution context
                        if (execution.context.videoLink && mediaUrl === '{{videoLink}}') {
                            mediaUrl = execution.context.videoLink;
                        }
                        if (messageContent.includes('{{videoLink}}')) {
                            const videoLink = execution.context.videoLink || '';
                            messageContent = messageContent.replace(/\{\{videoLink\}\}/g, videoLink);
                        }
                        if (messageContent.includes('{{username}}')) {
                            const username = contact?.username || '';
                            messageContent = messageContent.replace(/\{\{username\}\}/g, username);
                        }
                        // Queue DM job
                        const { addDMJob } = await import('../queues/dmQueue.js');
                        await addDMJob({
                            workspaceId,
                            instagramAccountId: automation.instagramAccountId.toString(),
                            contactId,
                            conversationId,
                            recipientId,
                            message: {
                                text: messageContent,
                                mediaUrl,
                                quickReplies: nodeData.quickReplies,
                            },
                            automationId,
                        });
                        break;
                    }
                    case 'ai_agent': {
                        // Queue AI job
                        const { addAIJob } = await import('../queues/aiQueue.js');
                        await addAIJob({
                            workspaceId,
                            instagramAccountId: automation.instagramAccountId.toString(),
                            contactId,
                            conversationId: conversationId || '',
                            message: triggerPayload.message || '',
                            brandName: nodeData.brandName || 'RsuShop',
                            niche: nodeData.niche || 'default',
                            customPrompt: nodeData.prompt,
                            automationId,
                        });
                        break;
                    }
                    case 'condition': {
                        // Evaluate condition
                        const conditionMet = evaluateCondition(nodeData, execution.context);
                        const branch = conditionMet ? 'true' : 'false';
                        // Find edge with matching sourceHandle
                        const nextEdge = edges.find((e) => e.source === currentNodeId && e.sourceHandle === branch);
                        if (nextEdge) {
                            currentNodeId = nextEdge.target;
                            continue;
                        }
                        // Fall through to next node
                        break;
                    }
                    case 'delay': {
                        // For delay nodes, we'd normally schedule a delayed job
                        // For simplicity, just delay the execution
                        const delayMs = nodeData.delayMs || 5000;
                        await new Promise(resolve => setTimeout(resolve, Math.min(delayMs, 5000)));
                        break;
                    }
                    case 'update_contact': {
                        const { field, value } = nodeData;
                        const update = {};
                        if (field === 'leadScore') {
                            update.leadScore = value;
                        }
                        else {
                            update[`customFields.${field}`] = value;
                        }
                        await index_js_1.Contact.findByIdAndUpdate(contactId, update);
                        break;
                    }
                    case 'add_to_list': {
                        await index_js_1.Contact.findByIdAndUpdate(contactId, {
                            $addToSet: { lists: nodeData.listName },
                        });
                        break;
                    }
                    case 'remove_from_list': {
                        await index_js_1.Contact.findByIdAndUpdate(contactId, {
                            $pull: { lists: nodeData.listName },
                        });
                        break;
                    }
                    case 'check_follow_status': {
                        // Check if the contact follows the IG business account
                        const contact = await index_js_1.Contact.findById(contactId);
                        if (!contact) {
                            error = 'Contact not found for follow check';
                            break;
                        }
                        // Get the IG account's access token
                        const igAccount = await index_js_1.InstagramAccount.findById(automation.instagramAccountId);
                        if (!igAccount) {
                            error = 'Instagram account not found';
                            break;
                        }
                        const accessToken = igAccount.getDecryptedToken();
                        const igUserId = igAccount.instagramId;
                        // Check follow status using the Instagram Graph API followers endpoint
                        let followStatus = 'unknown';
                        try {
                            // Fetch the list of followers for the business account
                            const followersUrl = `${connection_js_1.default.instagram.graphApiBase}/${connection_js_1.default.instagram.apiVersion}/${igUserId}/followers?access_token=${accessToken}`;
                            const followersResponse = await fetch(followersUrl);
                            const followersData = await followersResponse.json();
                            if (followersResponse.ok && followersData.data) {
                                const isFollowing = followersData.data.some((f) => f.id === contact.igUserId);
                                followStatus = isFollowing ? 'following' : 'not_following';
                            }
                            else if (followersData.error?.code === 100) {
                                // Permission error or user not in followers
                                followStatus = 'not_following';
                            }
                        }
                        catch (err) {
                            console.error('Error checking follow status:', err);
                            followStatus = 'unknown';
                        }
                        // Update contact with the follow status
                        contact.followStatus = followStatus;
                        await contact.save();
                        // Store in execution context for condition nodes to use
                        execution.context.followStatus = followStatus;
                        // Store the configured messages and video link for the branching message nodes
                        if (nodeData.followMessage) {
                            execution.context.followMessage = nodeData.followMessage;
                        }
                        if (nodeData.videoMessage) {
                            execution.context.videoMessage = nodeData.videoMessage;
                        }
                        if (nodeData.videoLink) {
                            execution.context.videoLink = nodeData.videoLink;
                        }
                        break;
                    }
                    case 'end': {
                        currentNodeId = '';
                        break;
                    }
                }
                // Find next node (following first available edge)
                if (currentNodeId) {
                    const nextEdge = edges.find((e) => e.source === currentNodeId);
                    if (nextEdge) {
                        currentNodeId = nextEdge.target;
                    }
                    else {
                        break; // No more edges
                    }
                }
            }
            if (stepCount >= MAX_STEPS) {
                error = 'Max steps exceeded (possible infinite loop)';
            }
        }
        catch (err) {
            error = err.message;
        }
        // Complete execution
        if (error) {
            execution.status = 'failed';
            execution.error = error;
            await automation.incrementFailed();
        }
        else {
            execution.status = 'completed';
            await automation.incrementCompleted();
        }
        execution.completedAt = new Date();
        execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime();
        await execution.save();
        await automation.incrementTriggered();
        return {
            status: execution.status,
            steps: stepCount,
            path: execution.executionPath,
            duration: execution.duration,
            error,
        };
    }, {
        connection: (0, queues_js_1.getConnection)(),
        concurrency: 20,
    });
    worker.on('completed', (job, result) => {
        console.log(`Flow job ${job.id} completed: ${result.status}`);
    });
    worker.on('failed', (job, err) => {
        console.error(`Flow job ${job?.id} failed:`, err.message);
    });
    return worker;
};
exports.createFlowExecutionWorker = createFlowExecutionWorker;
function validateTrigger(triggerType, payload, config) {
    switch (triggerType) {
        case 'keyword':
            return true; // Simplified
        case 'comment':
            return true;
        case 'new_follower':
            return true;
        default:
            return true;
    }
}
function evaluateCondition(nodeData, context) {
    const conditions = nodeData.conditions;
    const logic = nodeData.logic || 'all';
    const results = conditions.map(cond => {
        const fieldValue = context[cond.field] || '';
        const condValue = cond.value;
        switch (cond.operator) {
            case 'contains':
                return fieldValue.toLowerCase().includes(condValue.toLowerCase());
            case 'equals':
                return fieldValue.toLowerCase() === condValue.toLowerCase();
            case 'starts_with':
                return fieldValue.toLowerCase().startsWith(condValue.toLowerCase());
            case 'not_contains':
                return !fieldValue.toLowerCase().includes(condValue.toLowerCase());
            case 'gt':
                return parseFloat(fieldValue) > parseFloat(condValue);
            case 'lt':
                return parseFloat(fieldValue) < parseFloat(condValue);
            case 'is_following':
                // Check if followStatus in context matches expected value
                const followStatus = context.followStatus || context[cond.field] || '';
                return followStatus.toLowerCase() === 'following';
            case 'not_following':
                const status = context.followStatus || context[cond.field] || '';
                return status.toLowerCase() === 'not_following';
            default:
                return false;
        }
    });
    return logic === 'all' ? results.every(Boolean) : results.some(Boolean);
}
//# sourceMappingURL=flowExecution.js.map