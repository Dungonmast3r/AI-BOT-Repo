const { SlashCommandBuilder } = require("discord.js");
const log = require("../../handlers/logger");
const { tempChannels, getOwner } = require("../../utils/tempChannels");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("lock")
    .setDescription("Lock your temporary voice channel (only you can join)"),

  async execute(interaction) {
    const { member, guild } = interaction;
    const voiceChannel = member.voice.channel;

    if (!voiceChannel) {
      return interaction.reply({
        content: "❌ You must be in a voice channel to use this command.",
        flags: 64,
      });
    }

    if (!voiceChannel.name.startsWith("🔒")) {
      return interaction.reply({
        content:
          "❌ This command can only be used in temporary voice channels.",
        flags: 64,
      });
    }

    const ownerId = getOwner(voiceChannel.id);
    const isOwner =
      ownerId === member.id || member.permissions.has("Administrator");

    if (!isOwner) {
      return interaction.reply({
        content: "❌ Only the room owner can lock or unlock this channel.",
        flags: 64,
      });
    }

    try {
      await voiceChannel.permissionOverwrites.edit(guild.id, {
        Connect: false,
      });

      await interaction.reply({
        content:
          "🔒 Your voice channel has been **locked**. Only you (and the bot) can join now.",
        flags: 64,
      });

      log.info(`${member.user.tag} locked temp channel: ${voiceChannel.name}`);
    } catch (err) {
      log.error("Failed to lock channel:", err);
      await interaction.reply({
        content: "❌ Failed to lock the channel.",
        flags: 64,
      });
    }
  },
};
