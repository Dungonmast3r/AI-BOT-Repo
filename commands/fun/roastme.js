// commands/fun/roastme.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getAIResponse } = require('../../utils/ai'); // your Groq function

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roastme')
    .setDescription('Get roasted by the AI')
    .addUserOption(opt => opt.setName('target').setDescription('Who to roast (optional)').setRequired(false)),

  async execute(interaction) {
    await interaction.deferReply();

    const target = interaction.options.getUser('target') || interaction.user;
    const prompt = `Roast ${target.username} in a savage, funny, creative way. Keep it under 2 sentences. Be brutal but not too mean.`;

    try {
      const roast = await getAIResponse(new Map(), 'roast-session', prompt); // use your AI function

      const embed = new EmbedBuilder()
        .setColor(0xff4500)
        .setTitle('🔥 AI Roast')
        .setDescription(roast)
        .setThumbnail(target.displayAvatarURL({ size: 512 }))
        .setFooter({ text: `Roasted by Dungeon AI` })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await interaction.editReply({ content: 'Failed to roast... the AI is too scared 😭', ephemeral: true });
    }
  },
};