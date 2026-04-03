"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const connection_js_1 = __importDefault(require("./queues/connection.js"));
const dmSender_js_1 = require("./processors/dmSender.js");
const aiAgent_js_1 = require("./processors/aiAgent.js");
const flowExecution_js_1 = require("./processors/flowExecution.js");
const webhookProcessor_js_1 = require("./processors/webhookProcessor.js");
async function start() {
    console.log('Starting RsuShop Worker...');
    // Connect to MongoDB
    await mongoose_1.default.connect(connection_js_1.default.mongodb.uri);
    console.log('Worker connected to MongoDB');
    // Create workers
    const dmWorker = (0, dmSender_js_1.createDMSenderWorker)();
    const aiWorker = (0, aiAgent_js_1.createAIWorker)();
    const flowWorker = (0, flowExecution_js_1.createFlowExecutionWorker)();
    const webhookWorker = (0, webhookProcessor_js_1.createWebhookWorker)();
    console.log('All workers started');
    // Graceful shutdown
    const shutdown = async () => {
        console.log('Shutting down workers...');
        await dmWorker.close();
        await aiWorker.close();
        await flowWorker.close();
        await webhookWorker.close();
        await mongoose_1.default.disconnect();
        process.exit(0);
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
}
start().catch(console.error);
//# sourceMappingURL=index.js.map