const { useMainPlayer } = require("discord-player");
const { Events, ButtonInteraction } = require("discord.js");
const OWNER_IDS = ["162098920460124160"]; // add your real ID(s) here

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    // Handle chat commands (your existing logic)
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) return;

      if (command.devOnly && !OWNER_IDS.includes(interaction.user.id)) {
        return interaction.reply({
          content: "This command is developer-only.",
          ephemeral: true,
        });
      }

      const player = useMainPlayer();

      try {
        await player.context.provide({ guild: interaction.guild }, () =>
          command.execute(interaction),
        );
      } catch (error) {
        console.error(error);
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: "There was an error!",
            ephemeral: true,
          });
        }
      }

      return; // Stop here for commands
    }

    if (!interaction.isButton()) return;
    // Handle radio station selection
    if (
      interaction.isStringSelectMenu() &&
      interaction.customId === "radio_select"
    ) {
      const selectedUrl = interaction.values[0];

      if (!selectedUrl || !selectedUrl.startsWith("http")) {
        return interaction.reply({
          content: "Invalid station URL.",
          ephemeral: true,
        });
      }

      const voiceChannel = interaction.member.voice.channel;
      if (!voiceChannel) {
        return interaction.reply({
          content: "You need to be in a voice channel to play radio!",
          ephemeral: true,
        });
      }

      const playerCtx = interaction.client.playerCtx;

      try {
        await playerCtx.player.play(voiceChannel, selectedUrl, {
          nodeOptions: {
            metadata: interaction,
            leaveOnEnd: false,
            leaveOnEmpty: false,
          },
        });

        const embed = new EmbedBuilder()
          .setColor(0x1abc9c)
          .setTitle("📻 Radio Playing")
          .setDescription(
            `Now streaming the selected station!\nURL: ${selectedUrl}`,
          )
          .addFields({
            name: "Channel",
            value: voiceChannel.name,
            inline: true,
          })
          .setFooter({ text: "Use /stop to end the stream" })
          .setTimestamp();

        await interaction.update({ embeds: [embed], components: [] });
        log.success(`Radio started from search: ${selectedUrl}`);
      } catch (err) {
        log.error("Radio play from search failed:", err);
        await interaction.reply({
          content: "Failed to play the selected station.",
          ephemeral: true,
        });
      }
    }

    const customId = interaction.customId;

    if (!customId.startsWith("music_")) return;

    const player = useMainPlayer();
    const queue = player.queues.get(interaction.guild.id);

    if (!queue) {
      return interaction.reply({
        content: "No active queue!",
        ephemeral: true,
      });
    }

    try {
      let statusMessage = "";

      switch (customId) {
        case "music_pause_resume":
          if (queue.node.isPaused()) {
            queue.node.resume();
            statusMessage = "▶️ Playback resumed!";
          } else {
            queue.node.pause();
            statusMessage = "⏸️ Playback paused!";
          }
          break;

        case "music_skip":
          queue.node.skip();
          statusMessage = "⏭️ Skipped current track!";
          break;

        case "music_loop":
          if (queue.repeatMode === 0) {
            queue.setRepeatMode(1); // Loop current track
            statusMessage = "🔂 Looping current track!";
          } else if (queue.repeatMode === 1) {
            queue.setRepeatMode(2); // Loop entire queue
            statusMessage = "🔁 Looping entire queue!";
          } else {
            queue.setRepeatMode(0); // Turn off loop
            statusMessage = "Loop turned off!";
          }
          break;

        case "music_stop":
          queue.delete(); // Stops and clears queue
          statusMessage = "⏹️ Music stopped & queue cleared";
          // Remove buttons when stopping completely
          await interaction.update({
            content: statusMessage,
            embeds: [],
            components: [],
          });
          return; // Exit early
          break;

        default:
          statusMessage = "Unknown button action!";
      }

      // Update message: keep buttons, show status
      await interaction.update({
        content: statusMessage,
        components: interaction.message.components, // keep existing buttons
      });
    } catch (err) {
      console.error("Button handler error:", err);
      await interaction.reply({
        content: "Failed to process button action",
        ephemeral: true,
      });
    }
  },
};
