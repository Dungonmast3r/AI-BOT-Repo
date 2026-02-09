// structures/PlayerContext.js
const log = require("./../handlers/logger");
const { EmbedBuilder } = require("discord.js");
const { useMainPlayer } = require("discord-player");

class PlayerContext {
  constructor(client) {
    this.client = client;

    this.player = useMainPlayer();

    // Hide noisy [YouTubeJS] parser logs
    this.player.on("debug", (message) => {
      // Ignore these specific parser warnings
      if (
        message.includes("[YouTubeJS]") ||
        message.includes('[Lag Monitor]') ||
        message.includes("Unable to find matching run") ||
        message.includes("command run") ||
        message.includes("Skipping...") ||
        message.includes("InnertubeError") ||
        message.includes("ParsingError")
      ) {
        return; // silently discard
      }

      // Keep other useful debug messages
      //log.debug("Player debug:", message);
    });
  }

  getQueue(guildId) {
    return this.player.queues.get(guildId) || null;
  }

  nowPlaying(guildId) {
    const queue = this.getQueue(guildId);
    return queue?.currentTrack || null;
  }

  async reply(interaction, content, ephemeral = false) {
    const embed = new EmbedBuilder()
      .setDescription(content)
      .setColor(ephemeral ? 0xff0000 : 0x00ff88);

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ embeds: [embed], ephemeral });
    } else {
      await interaction.reply({ embeds: [embed], ephemeral });
    }
  }
}

module.exports = PlayerContext;
