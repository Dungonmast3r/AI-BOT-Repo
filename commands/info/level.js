const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const levelManager = require("../../utils/levelManager");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("level")
    .setDescription("Check your current level and XP"),

  async execute(interaction) {
    const userData = levelManager.getUser(
      interaction.guild.id,
      interaction.user.id,
    );

    const xpNeeded = Math.floor(100 * Math.pow(userData.level, 1.5)); // rough formula

    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle(`${interaction.user.username}'s Level`)
      .setThumbnail(interaction.user.displayAvatarURL())
      .addFields(
        { name: "Level", value: userData.level.toString(), inline: true },
        { name: "XP", value: `${userData.xp} / ${xpNeeded}`, inline: true },
        {
          name: "Progress",
          value: `${Math.round((userData.xp / xpNeeded) * 100)}%`,
        },
      );

    await interaction.reply({ embeds: [embed] });
  },
};
