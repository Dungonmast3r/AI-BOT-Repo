const { EmbedBuilder } = require("discord.js");

const nowPlayingEmbed = ({ guild, track }) => {
  const safeTrack = track || {};
  const title = safeTrack.title || "Unknown track";
  const author = safeTrack.author || "Unknown artist";
  const thumbnail = safeTrack.thumbnail;
  const duration = safeTrack.duration || "Unknown";

  const embed = new EmbedBuilder()
    .setColor("DarkPurple")
    .setTitle("Greg's Bard")
    .setDescription(`**${title}** is now playing!`)
    .setThumbnail(guild.iconURL())
    .addFields(
      { name: "**Title**:", value: title, inline: true },
      { name: "**Author**:", value: author, inline: true },
      { name: "**Duration**:", value: duration },
    )
    .setTimestamp()
    .setFooter({ text: guild.name, iconURL: guild.iconURL() });

  return { embed };
};

module.exports = {
  nowPlayingEmbed,
};