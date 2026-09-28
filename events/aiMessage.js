const { Events } = require('discord.js');
const { getStore } = require('../utils/guildSettings');
const pending = new Set();
const cooldowns = new Map();
module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (!message.guild || message.author.bot) return;
    const settings = getStore().get(message.guild.id);
    if (!settings.aiEnabled || !settings.aiChannelId || message.channel.id !== settings.aiChannelId) return;
    if (settings.mentionOnly && !message.mentions.users.has(message.client.user.id)) return;
    if (!process.env.GROQ_API_KEY) return;
    const key = `${message.guild.id}:${message.author.id}`;
    if (pending.has(key) || Date.now() - (cooldowns.get(key) || 0) < 10000) return;
    const prompt = message.content.replace(new RegExp(`<@!?${message.client.user.id}>`, 'g'), '').trim().slice(0, 4000);
    if (!prompt) return;
    pending.add(key); cooldowns.set(key, Date.now());
    if (cooldowns.size > 10000) for (const [id, time] of cooldowns) if (Date.now() - time > 10000) cooldowns.delete(id);
    try {
      await message.channel.sendTyping();
      const answer = await require('../utils/ai').getAIResponse(message.client.conversationHistory, key, prompt);
      await message.reply({ content: answer.slice(0, 2000), allowedMentions: { parse: [], repliedUser: false } });
    } catch { await message.reply({ content: 'AI is unavailable right now. Please try again later.', allowedMentions: { parse: [], repliedUser: false } }).catch(() => {}); }
    finally { pending.delete(key); }
  },
};
