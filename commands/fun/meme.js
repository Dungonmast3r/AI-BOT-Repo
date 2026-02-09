// commands/fun/meme.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
  data: new SlashCommandBuilder().setName('meme').setDescription('Get a random meme'),
  async execute(interaction) {
    await interaction.deferReply();

    try {
      const res = await axios.get('https://meme-api.com/gimme');
      const meme = res.data;

      const embed = new EmbedBuilder()
        .setColor(0xff4500)
        .setTitle(meme.title)
        .setImage(meme.url)
        .setFooter({ text: `From: r/${meme.subreddit}` });

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await interaction.editReply({ content: 'Failed to fetch meme 😢', ephemeral: true });
    }
  },
};