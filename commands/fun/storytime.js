// commands/fun/storytime.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getAIResponse } = require('../../utils/ai');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('storytime')
    .setDescription('Hear a short AI-generated story')
    .addStringOption(opt => opt.setName('theme').setDescription('Story theme or prompt (optional)')),

  async execute(interaction) {
    await interaction.deferReply();

    const theme = interaction.options.getString('theme') || 'a random funny adventure';
    const prompt = `Tell a short, funny, creative story (3-5 sentences) about: ${theme}. Make it engaging and end with a twist.`;

    try {
      const story = await getAIResponse(new Map(), 'story-session', prompt);

      const embed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle(`📖 Story Time: ${theme}`)
        .setDescription(story)
        .setFooter({ text: 'Told by Dungeon AI' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await interaction.editReply({ content: 'The story got lost in the dungeon...', ephemeral: true });
    }
  },
};