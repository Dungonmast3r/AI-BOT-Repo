const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const levelManager = require("../../utils/levelManager");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Show the top 10 users by level"),

  async execute(interaction) {
    const top = levelManager.getLeaderboard(interaction.guild.id, 10);

    if (top.length === 0) {
      return interaction.reply("No one has earned XP yet!");
    }

    let description = "";
    top.forEach((entry, index) => {
      const user = interaction.guild.members.cache.get(entry.userId);
      description += `${index + 1}. ${user ? user.user.tag : "Unknown User"} — Level ${entry.level} (${entry.xp} XP)\n`;
    });

    const embed = new EmbedBuilder()
      .setTitle(`🏆 Level Leaderboard — ${interaction.guild.name}`)
      .setDescription(description)
      .setColor(0xffaa00)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
