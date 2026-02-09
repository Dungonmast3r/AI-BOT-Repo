const { SlashCommandBuilder } = require('discord.js');
const log = require('../../handlers/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stops the current radio or music and clears queue'),

  async execute(interaction) {
    const playerCtx = interaction.client.playerCtx;
    const queue = playerCtx.getQueue(interaction.guild.id);

    if (!queue) {
      return interaction.reply({ content: 'Nothing is playing!', ephemeral: true });
    }

    queue.delete();
    log.success(`Music/radio stopped in ${interaction.guild.name}`);

    await interaction.reply('⏹️ Stopped playback and cleared queue.');
  },
};