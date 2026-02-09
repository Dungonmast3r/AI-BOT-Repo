// commands/info/leaderboard.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('See the top grinders in the server 🎮🏆'),

  async execute(interaction) {
    await interaction.deferReply();

    const client = interaction.client;
    const sorted = Object.entries(client.usersData || {})
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.level - a.level || b.xp - a.xp)
      .slice(0, 10);

    if (sorted.length === 0) {
      return interaction.editReply("Nobody has grinded yet... sadge 😔 Start chatting!");
    }

    let description = '';
    for (let i = 0; i < sorted.length; i++) {
      const entry = sorted[i];
      const user = await client.users.fetch(entry.id).catch(() => null);
      const name = user ? user.username : `User ${entry.id.slice(0,8)}...`;
      description += `${i + 1}. **${name}** — Lv ${entry.level} (${entry.xp} XP)\n`;
    }

    const embed = new EmbedBuilder()
      .setTitle('🏆 Server XP Leaderboard 🎮')
      .setDescription(description)
      .setColor(0xFFD700)
      .setFooter({ text: `Top ${sorted.length} grinders | Updated ${new Date().toLocaleTimeString()}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};