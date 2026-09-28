const { PermissionFlagsBits } = require('discord.js');
const { getStore } = require('./guildSettings');
const music = new Set(['play', 'stop', 'radio', 'radio-search']);
const ai = new Set(['dungeon', 'compliment', 'generatesong', 'quiz', 'roastme', 'storytime', 'wouldyourather']);
async function denial(interaction) {
  if (!interaction.guild) return 'Use this command in a server.';
  const settings = getStore().get(interaction.guild.id);
  const isMusic = music.has(interaction.commandName) || interaction.customId?.startsWith('music_') || interaction.customId === 'radio_select';
  if (ai.has(interaction.commandName) && !settings.aiEnabled) return 'AI is disabled for this server.';
  if (['level', 'leaderboard'].includes(interaction.commandName) && !settings.levelingEnabled) return 'Leveling is disabled for this server.';
  if (isMusic) {
    if (!settings.musicEnabled) return 'Music is disabled for this server.';
    if (settings.djRoleId) {
      const member = await interaction.guild.members.fetch({ user: interaction.user.id, force: true });
      if (!member.permissions.has(PermissionFlagsBits.ManageGuild) && !member.roles.cache.has(settings.djRoleId)) return 'You need the configured DJ role to control music.';
    }
  }
  return null;
}
module.exports = { denial };
