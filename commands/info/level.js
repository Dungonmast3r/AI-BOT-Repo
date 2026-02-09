// commands/info/level.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { xpForNextLevel } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('level')
    .setDescription('Check your current level & XP 🎮'),

  async execute(interaction) {
    const userId = interaction.user.id;
    const data = interaction.client.usersData?.[userId] || { xp: 0, level: 0 };

    const embed = new EmbedBuilder()
      .setTitle(`${interaction.user.username}'s Stats 🎮`)
      .addFields(
        { name: 'Level', value: `${data.level}`, inline: true },
        { name: 'XP', value: `${data.xp} / ${xpForNextLevel(data.level)}`, inline: true },
        { name: 'Progress', value: `${Math.round((data.xp / xpForNextLevel(data.level)) * 100)}% to next` }
      )
      .setColor(0x00AA00)
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: 'Keep grinding! | Dungeon' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};