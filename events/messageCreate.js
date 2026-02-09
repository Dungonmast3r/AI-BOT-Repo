// events/messageCreate.js
const { EmbedBuilder } = require('discord.js');
const config = require('../config');
const { getLevel, xpForNextLevel } = require('../utils/helpers');
const log = require('../handlers/logger'); // Logger import

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot || !message.guild) return;

    const userId = message.author.id;
    const now = Date.now();

    // Cooldown check
    if (client.cooldowns.has(userId) && now - client.cooldowns.get(userId) < config.xpCooldown) {
      return;
    }
    client.cooldowns.set(userId, now);

    // Initialize user data if missing
    if (!client.usersData[userId]) {
      client.usersData[userId] = { xp: 0, level: 0 };
      log.info(`Initialized new user data for ${message.author.tag} (${userId})`);
    }

    // Give random XP
    const xpGain = Math.floor(Math.random() * (config.xpMax - config.xpMin + 1)) + config.xpMin;
    client.usersData[userId].xp += xpGain;

    log.debug(`Gave ${xpGain} XP to ${message.author.tag} (total: ${client.usersData[userId].xp})`);

    // Calculate level
    const oldLevel = client.usersData[userId].level;
    const newLevel = getLevel(client.usersData[userId].xp);

    if (newLevel > oldLevel) {
      client.usersData[userId].level = newLevel;

      log.success(`${message.author.tag} leveled up! Level ${oldLevel} → ${newLevel}`);

      const embed = new EmbedBuilder()
        .setTitle(`${message.author.username} leveled up! 🎉`)
        .setDescription(`**Level ${oldLevel} → Level ${newLevel}**\nXP: ${client.usersData[userId].xp} / ${xpForNextLevel(newLevel)}`)
        .setColor(0xFFD700)
        .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: 'GGWP | Dungeon Master approves' })
        .setTimestamp();

      await message.channel.send({ embeds: [embed] }).catch((err) => {
        log.error('Failed to send level-up embed:', err.message);
      });
    }
  },
};