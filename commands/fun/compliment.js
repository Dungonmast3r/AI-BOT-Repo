// commands/fun/compliment.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getAIResponse } = require('../../utils/ai');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('compliment')
    .setDescription('Get a compliment from the AI')
    .addUserOption(opt => opt.setName('target').setDescription('Who to compliment (optional)').setRequired(false)),

  async execute(interaction) {
    await interaction.deferReply();

    const target = interaction.options.getUser('target') || interaction.user;
    const prompt = `Give ${target.username} a wholesome, creative, and funny compliment. Keep it under 2 sentences. Make it feel personal.`;

    try {
      const compliment = await getAIResponse(new Map(), 'compliment-session', prompt);

      const embed = new EmbedBuilder()
        .setColor(0xffd700)
        .setTitle('💛 AI Compliment')
        .setDescription(compliment)
        .setThumbnail(target.displayAvatarURL({ size: 512 }))
        .setFooter({ text: `From Dungeon AI` })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await interaction.editReply({ content: 'AI is too shy to compliment right now...', ephemeral: true });
    }
  },
};