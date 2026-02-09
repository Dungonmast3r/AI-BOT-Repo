// commands/music/generatesong.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getAIResponse } = require('../../utils/ai'); // your Groq function
const log = require('../../handlers/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('generatesong')
    .setDescription('Generate a full AI song concept')
    .addStringOption(opt =>
      opt.setName('genre').setDescription('Genre or style (e.g. lofi, metal, pop)').setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('theme').setDescription('Theme or mood (optional)').setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const genre = interaction.options.getString('genre');
    const theme = interaction.options.getString('theme') || 'life / love / chaos';

    const prompt = `Write a short original song concept in the style of ${genre}. Include:
- Catchy title
- 4-line chorus
- 2-line verse
- Overall mood/vibe
Keep it creative, fun, and under 200 words. Theme: ${theme}.`;

    try {
      const response = await getAIResponse(new Map(), 'song-gen-session', prompt);

      const embed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle('🎵 AI-Generated Song Concept')
        .setDescription(response)
        .setFooter({ text: `Generated with ${genre} vibes • Dungeon AI` })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      log.success(`Song concept generated for ${interaction.user.tag}`);
    } catch (err) {
      log.error('Song generation failed:', err);
      await interaction.editReply({ content: 'The muse is on strike... try again!', ephemeral: true });
    }
  },
};