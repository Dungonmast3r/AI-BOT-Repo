// commands/music/radio.js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const log = require("../../handlers/logger");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("radio")
    .setDescription("Plays a live internet radio station")
    .addStringOption((opt) =>
      opt
        .setName("station")
        .setDescription("Radio station name or URL")
        .setRequired(true)
        .addChoices(
          { name: "Custom URL", value: "custom" },
        ),
    )
    .addStringOption((opt) =>
      opt
        .setName("custom_url")
        .setDescription(
          'Custom radio stream URL (only if "Custom URL" selected)',
        )
        .setRequired(false),
    ),

  async execute(interaction) {
    await interaction.deferReply();

    let streamUrl = interaction.options.getString("station");
    const customUrl = interaction.options.getString("custom_url");

    if (streamUrl === "custom") {
      if (!customUrl || !customUrl.startsWith("http")) {
        return interaction.editReply({
          content:
            'Please provide a valid stream URL when selecting "Custom URL".',
          ephemeral: true,
        });
      }
      streamUrl = customUrl;
    }

    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
      return interaction.editReply("You need to be in a voice channel!");
    }

    const playerCtx = interaction.client.playerCtx;

    try {
      // Play direct stream URL — bypass extractors completely
      const result = await playerCtx.player.play(voiceChannel, streamUrl, {
        nodeOptions: {
          metadata: interaction,
          leaveOnEnd: false, // keep playing (radio is continuous)
          leaveOnEmpty: false, // don't leave if alone
        },
      });

      const stationName = streamUrl.includes("custom")
        ? "Custom Radio Stream"
        : interaction.options.getString("station");

      const embed = new EmbedBuilder()
        .setColor(0x1abc9c)
        .setTitle("📻 Live Radio Playing")
        .setDescription(`Station: **${stationName}**\nStream: ${streamUrl}`)
        .addFields(
          { name: "Channel", value: voiceChannel.name, inline: true },
          {
            name: "Status",
            value: "Streaming 24/7 • Use /stop to end",
            inline: true,
          },
        )
        .setFooter({ text: "Radio streams do not stop automatically" })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      log.success(`Radio started: ${streamUrl}`);
    } catch (err) {
      log.error("Radio failed:", err);
      await interaction.editReply({
        content:
          "Failed to play radio stream. The URL may be invalid or unsupported. Try another station.",
        ephemeral: true,
      });
    }
  },
};
