// commands/admin/tempvoice.js
const { SlashCommandBuilder } = require('discord.js');
const config = require('../../config');
const log = require('../../handlers/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tempvoice')
    .setDescription('Manage temp voice channel creation')
    .addSubcommand(sub =>
      sub.setName('enable').setDescription('Enable temp voice channels')
    )
    .addSubcommand(sub =>
      sub.setName('disable').setDescription('Disable temp voice channels')
    ),

  async execute(interaction) {
    if (!interaction.member.permissions.has('ManageGuild')) {
      return interaction.reply({ content: 'Admins only.', ephemeral: true });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'enable') {
      if (!config.tempVoice.enabledGuilds.includes(interaction.guild.id)) {
        config.tempVoice.enabledGuilds.push(interaction.guild.id);
        await interaction.reply('Temp voice channels **enabled** for this server.');
        log.success(`Temp voice enabled in ${interaction.guild.name}`);
      } else {
        await interaction.reply('Temp voice is already enabled.');
      }
    } else if (sub === 'disable') {
      config.tempVoice.enabledGuilds = config.tempVoice.enabledGuilds.filter(id => id !== interaction.guild.id);
      await interaction.reply('Temp voice channels **disabled** for this server.');
      log.success(`Temp voice disabled in ${interaction.guild.name}`);
    }
  },
};