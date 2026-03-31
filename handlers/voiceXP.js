// handlers/voiceXP.js
const levelManager = require("../utils/levelManager");

module.exports = (client, config) => {
  console.log("✅ Voice XP handler started");

  setInterval(() => {
    client.guilds.cache.forEach(async (guild) => {
      const earningUsers = levelManager.voiceIntervals.get(guild.id);
      if (!earningUsers || earningUsers.size === 0) return;

      for (const userId of earningUsers) {
        const member = guild.members.cache.get(userId);
        if (!member || !member.voice.channel) {
          levelManager.stopVoiceXP(guild.id, userId);
          continue;
        }

        // Give 8-15 XP per minute in voice (you can adjust this)
        const xpToAdd = Math.floor(Math.random() * 8) + 8;

        const result = levelManager.addXP(guild.id, userId, xpToAdd);

        if (result.leveledUp) {
          const levelChannel = guild.channels.cache.get(config.levelChannelId);

          const announceMsg = `🎉 **${member.user}** just leveled up to **Level ${result.newLevel}** from voice activity!`;

          if (levelChannel) {
            levelChannel.send(announceMsg).catch(() => {});
          } else {
            member.send(announceMsg).catch(() => {});
          }
        }
      }
    });
  }, 60000); // Runs every 60 seconds
};
