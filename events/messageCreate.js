// events/messageCreate.js
const { Events } = require("discord.js");
const levelManager = require("../utils/levelManager");
const config = require("../config"); // add levelChannelId later if you want

const cooldowns = new Map();

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (message.author.bot || message.guild === null) return;

    const now = Date.now();
    const cooldown = cooldowns.get(message.author.id);

    if (cooldown && now - cooldown < 60000) return; // 60 second cooldown

    cooldowns.set(message.author.id, now);

    // Give random XP between 15-25 (like MEE6)
    const xpToAdd = Math.floor(Math.random() * 11) + 15;

    const result = levelManager.addXP(
      message.guild.id,
      message.author.id,
      xpToAdd,
    );

    if (result.leveledUp) {
      const levelChannel = message.guild.channels.cache.get(
        config.levelChannelId,
      ); // optional

      const msg = `🎉 **${message.author}** just leveled up to **Level ${result.newLevel}**!`;

      if (levelChannel) {
        levelChannel.send(msg);
      } else {
        message.channel.send(msg);
      }
    }
  },
};
