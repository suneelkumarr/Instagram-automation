import { Worker, Job } from 'bullmq';
import { getConnection, QUEUE_NAMES } from '../queues/queues.js';
import config from '../queues/connection.js';
import { Automation, FlowExecution, Contact, Conversation, InstagramAccount } from '../models/index.js';

interface FlowJobData {
  workspaceId: string;
  automationId: string;
  contactId: string;
  conversationId?: string;
  triggerType: string;
  triggerPayload: Record<string, unknown>;
}

const MAX_STEPS = 50;

export const createFlowExecutionWorker = () => {
  const worker = new Worker<FlowJobData>(
    QUEUE_NAMES.FLOW_EXECUTION,
    async (job: Job<FlowJobData>) => {
      const { workspaceId, automationId, contactId, conversationId, triggerType, triggerPayload } = job.data;

      // Load automation
      const automation = await Automation.findOne({ _id: automationId, status: 'active' });
      if (!automation) {
        throw new Error('Automation not found or not active');
      }

      // Create execution record
      const execution = new FlowExecution({
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
      let currentNodeId = nodes.find((n: any) => n.type === 'trigger')?.id || '';
      let stepCount = 0;
      let error: string | undefined;

      try {
        while (currentNodeId && stepCount < MAX_STEPS) {
          stepCount++;
          execution.executionPath.push(currentNodeId);

          const node = nodes.find((n: any) => n.id === currentNodeId);
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
              const contact = await Contact.findById(contactId);
              const recipientId = contact?.igUserId || contact?.username || '';

              // Resolve message content with variables from context
              let messageContent = (nodeData.content as string) || '';
              let mediaUrl = (nodeData.mediaUrl as string) || '';

              // Variable substitution from execution context
              if (execution.context.videoLink && mediaUrl === '{{videoLink}}') {
                mediaUrl = execution.context.videoLink as string;
              }
              if (messageContent.includes('{{videoLink}}')) {
                const videoLink = (execution.context.videoLink as string) || '';
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
                message: triggerPayload.message as string || '',
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
              const nextEdge = edges.find((e: any) => e.source === currentNodeId && e.sourceHandle === branch);
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
              const update: Record<string, unknown> = {};
              if (field === 'leadScore') {
                update.leadScore = value;
              } else {
                update[`customFields.${field}`] = value;
              }
              await Contact.findByIdAndUpdate(contactId, update);
              break;
            }

            case 'add_to_list': {
              await Contact.findByIdAndUpdate(contactId, {
                $addToSet: { lists: nodeData.listName },
              });
              break;
            }

            case 'remove_from_list': {
              await Contact.findByIdAndUpdate(contactId, {
                $pull: { lists: nodeData.listName },
              });
              break;
            }

            case 'check_follow_status': {
              // Check if the contact follows the IG business account
              const contact = await Contact.findById(contactId);
              if (!contact) {
                error = 'Contact not found for follow check';
                break;
              }

              // Get the IG account's access token
              const igAccount = await InstagramAccount.findById(automation.instagramAccountId);
              if (!igAccount) {
                error = 'Instagram account not found';
                break;
              }

              const accessToken = igAccount.getDecryptedToken();
              const igUserId = igAccount.instagramId;

              // Check follow status using the Instagram Graph API followers endpoint
              let followStatus: 'following' | 'not_following' | 'requested' | 'unknown' = 'unknown';

              try {
                // Fetch the list of followers for the business account
                const followersUrl = `${config.instagram.graphApiBase}/${config.instagram.apiVersion}/${igUserId}/followers?access_token=${accessToken}`;
                const followersResponse = await fetch(followersUrl);
                const followersData = await followersResponse.json();

                if (followersResponse.ok && followersData.data) {
                  const isFollowing = followersData.data.some(
                    (f: any) => f.id === contact.igUserId
                  );
                  followStatus = isFollowing ? 'following' : 'not_following';
                } else if (followersData.error?.code === 100) {
                  // Permission error or user not in followers
                  followStatus = 'not_following';
                }
              } catch (err) {
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
            const nextEdge = edges.find((e: any) => e.source === currentNodeId);
            if (nextEdge) {
              currentNodeId = nextEdge.target;
            } else {
              break; // No more edges
            }
          }
        }

        if (stepCount >= MAX_STEPS) {
          error = 'Max steps exceeded (possible infinite loop)';
        }

      } catch (err) {
        error = (err as Error).message;
      }

      // Complete execution
      if (error) {
        execution.status = 'failed';
        execution.error = error;
        await automation.incrementFailed();
      } else {
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
    },
    {
      connection: getConnection(),
      concurrency: 20,
    }
  );

  worker.on('completed', (job, result) => {
    console.log(`Flow job ${job.id} completed: ${result.status}`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Flow job ${job?.id} failed:`, err.message);
  });

  return worker;
};

function validateTrigger(triggerType: string, payload: Record<string, unknown>, config: Record<string, unknown>): boolean {
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

function evaluateCondition(nodeData: Record<string, unknown>, context: Record<string, unknown>): boolean {
  const conditions = nodeData.conditions as Array<{
    field: string;
    operator: string;
    value: string;
  }>;
  const logic = (nodeData.logic as string) || 'all';

  const results = conditions.map(cond => {
    const fieldValue = context[cond.field] as string || '';
    const condValue = cond.value as string;

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
        const followStatus = (context.followStatus as string) || (context[cond.field] as string) || '';
        return followStatus.toLowerCase() === 'following';
      case 'not_following':
        const status = (context.followStatus as string) || (context[cond.field] as string) || '';
        return status.toLowerCase() === 'not_following';
      default:
        return false;
    }
  });

  return logic === 'all' ? results.every(Boolean) : results.some(Boolean);
}
