import { Client } from "discord.js-selfbot-v13";
import config from "./config.js";
import fs from 'fs';
import path from 'path';
import logger from './utils/logger.js';
import { downloadExecutable, checkForUpdatesAndUpdate } from './utils/yt-dlp.js';

import { handleReady } from './events/client/ready.js';
import { handleMessageCreate } from './events/messageCreate.js';
import { handleVoiceStateUpdate } from './events/voiceStateUpdate.js';

import { StreamingService } from './services/streaming.js';
import { MediaService } from './services/media.js';
import { CommandManager } from './commands/manager.js';
import { QueueService } from './services/queue.js';

// ✅ BUG FIX: التحقق من TOKEN قبل أي شيء
if (!config.token) {
	logger.error("❌ TOKEN is missing in .env file! Bot cannot start.");
	process.exit(1);
}

(async () => {
	try {
		await downloadExecutable();
		await checkForUpdatesAndUpdate();
	} catch (error) {
		logger.error("Error during initial yt-dlp setup/update:", error);
	}
})();

const client = new Client();
const queueService = new QueueService();

const streamStatus = {
	joined: false,
	joinsucc: false,
	playing: false,
	manualStop: false,
	channelInfo: {
		guildId: config.guildId,
		channelId: config.videoChannelId,
		cmdChannelId: config.cmdChannelId
	},
	queue: queueService.getQueueStatus()
}

const streamingService = new StreamingService(client, streamStatus);
const mediaService = new MediaService();
const commandManager = new CommandManager();

if (!fs.existsSync(config.videosDir)) fs.mkdirSync(config.videosDir);
if (!fs.existsSync(path.dirname(config.previewCacheDir))) {
	fs.mkdirSync(path.dirname(config.previewCacheDir), { recursive: true });
}
if (!fs.existsSync(config.previewCacheDir)) fs.mkdirSync(config.previewCacheDir);

const videoFiles = fs.readdirSync(config.videosDir);
let videos = videoFiles.map(file => ({
	name: path.parse(file).name,
	path: path.join(config.videosDir, file)
}));

if (videos.length > 0) {
	logger.info(`Available videos:\n${videos.map(m => m.name).join('\n')}`);
}

client.on("ready", async () => {
	await handleReady(client);
});

client.on('voiceStateUpdate', async (oldState, newState) => {
	await handleVoiceStateUpdate(oldState, newState, streamStatus, client);
});

client.on('messageCreate', async (message) => {
	await handleMessageCreate(message, videos, streamStatus, streamingService, commandManager);
});

process.on('uncaughtException', (error) => {
	if (!(error instanceof Error && error.message.includes('SIGTERM'))) {
		logger.error('Uncaught Exception:', error);
	}
});

if (config.server_enabled) {
	import('./server/index.js');
}

// ✅ BUG FIX: إضافة catch لفشل تسجيل الدخول
client.login(config.token).catch((error) => {
	logger.error("❌ Failed to login to Discord:", error.message);
	logger.error("Check your TOKEN in the .env file.");
	process.exit(1);
});
