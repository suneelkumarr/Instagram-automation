import mongoose from 'mongoose';
import config from './queues/connection.js';
import { createDMSenderWorker } from './processors/dmSender.js';
import { createAIWorker } from './processors/aiAgent.js';
import { createFlowExecutionWorker } from './processors/flowExecution.js';
import { createWebhookWorker } from './processors/webhookProcessor.js';

async function start() {
  console.log('Starting RsuShop Worker...');

  // Connect to MongoDB
  await mongoose.connect(config.mongodb.uri);
  console.log('Worker connected to MongoDB');

  // Create workers
  const dmWorker = createDMSenderWorker();
  const aiWorker = createAIWorker();
  const flowWorker = createFlowExecutionWorker();
  const webhookWorker = createWebhookWorker();

  console.log('All workers started');

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down workers...');
    await dmWorker.close();
    await aiWorker.close();
    await flowWorker.close();
    await webhookWorker.close();
    await mongoose.disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start().catch(console.error);
