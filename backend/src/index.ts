import './loadEnv.js';
import { HttpServer } from './HttpServer.js';
import { InboundMessageWorker } from './services/InboundMessageWorker.js';
import { ConversationRetention } from './services/ConversationRetention.js';
import { BulkMessageDispatch } from './services/BulkMessageDispatch.js';

const server = new HttpServer().configure();

if (process.env.ENABLE_BACKGROUND_WORKERS !== '0') {
  InboundMessageWorker.start();
  ConversationRetention.start();
  BulkMessageDispatch.start();
}

server.listen();
