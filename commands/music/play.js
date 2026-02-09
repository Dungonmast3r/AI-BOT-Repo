// commands/music/play.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const log = require("../../handlers/logger");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Plays a song")
    .addStringOption((opt) =>
      opt.setName("query").setDescription("Song/URL").setRequired(true),
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const query = interaction.options.getString("query");
    const voiceChannel = interaction.member.voice.channel;
    log.info("Play command invoked with query:", query);

    if (!voiceChannel) {
      return interaction.editReply("You need to be in a voice channel!");
    }

    const playerCtx = interaction.client.playerCtx;
    const queue = playerCtx.getQueue(interaction.guild.id);

    try {
      const result = await playerCtx.player.play(voiceChannel, query, {
        nodeOptions: {
          metadata: interaction,
        },
      });

      const track = result.track;

      // Determine current loop status
      let loopStatus = "Off";
      if (queue?.repeatMode === 1) loopStatus = "🔂 This Track";
      if (queue?.repeatMode === 2) loopStatus = "🔁 All Queue";

      // Fancy queued embed with updated loop status
      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setAuthor({
          name: "Song Queued",
          iconURL:
            interaction.client.user.displayAvatarURL({ size: 32 }) || null,
        })
        .setTitle(`🎶 ${track.title}`)
        .setURL(track.url)
        .setDescription(
          `**Artist / Channel**: ${track.author || "Unknown"}\n` +
            `**Duration**: ${track.duration || "Live"}\n` +
            `**Requested by**: ${interaction.user.tag}`,
        )
        .setThumbnail(interaction.guild.iconURL({ size: 1024 }) || null)
        .setImage(track.thumbnail || interaction.guild.iconURL({ size: 1024 }) || null)
        .setFooter({ text: "Queued successfully • Buttons active for 15 min" })
        .setTimestamp();

      // Buttons row
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("music_pause_resume")
          .setLabel("Pause / Resume")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("music_skip")
          .setLabel("Skip")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId("music_loop")
          .setLabel("Loop")
          .setEmoji("🔂")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId("music_stop")
          .setLabel("Stop")
          .setStyle(ButtonStyle.Danger),
      );

      await interaction.editReply({
        embeds: [embed],
        components: [row],
      });

      log.success(`Queued: ${track.title}`);
    } catch (err) {
      log.error("Play failed", err);

      const errorEmbed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle("Error")
        .setDescription(
          "Failed to play the track. Try a different song or check voice channel permissions.",
        );

      await interaction.editReply({ embeds: [errorEmbed], ephemeral: true });
    }
  },
};
