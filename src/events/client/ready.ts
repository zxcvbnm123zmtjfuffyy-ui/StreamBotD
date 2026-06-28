import { Client, ActivityOptions } from "discord.js-selfbot-v13";
import logger from "../../utils/logger.js";
import { DiscordUtils } from "../../utils/shared.js";
import config from "../../config.js";

export async function handleReady(client: Client): Promise<void> {
	if (!client.user) {
		logger.error("❌ Client user is null after ready event!");
		return;
	}

	logger.info(`✅ Logged in as: ${client.user.tag} (ID: ${client.user.id})`);

	// ✅ BUG FIX: التحقق من الإعدادات الضرورية عند الاتصال
	const missingConfig: string[] = [];
	if (!config.guildId)        missingConfig.push("GUILD_ID");
	if (!config.cmdChannelId)   missingConfig.push("COMMAND_CHANNEL_ID");
	if (!config.videoChannelId) missingConfig.push("VIDEO_CHANNEL_ID");

	if (missingConfig.length > 0) {
		logger.error(`❌ Missing required config values: ${missingConfig.join(", ")}`);
		logger.error("Bot commands will NOT work correctly. Please check your .env file.");
	} else {
		logger.info(`✅ Guild ID: ${config.guildId}`);
		logger.info(`✅ Command Channel: ${config.cmdChannelId}`);
		logger.info(`✅ Video Channel: ${config.videoChannelId}`);
		logger.info(`✅ Prefix: "${config.prefix}"`);
		if (config.adminIds && config.adminIds.length > 0) {
			logger.info(`✅ Admins: ${config.adminIds.join(", ")}`);
		} else {
			logger.warn("⚠️  No ADMIN_IDS set — all users can use admin commands!");
		}
	}

	client.user.setActivity(DiscordUtils.status_idle() as ActivityOptions);
}
