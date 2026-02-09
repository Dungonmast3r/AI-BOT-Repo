// commands/music/radio-search.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require("discord.js");
const axios = require("axios");
const log = require("../../handlers/logger");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("radio-search")
    .setDescription("Search for live radio stations by genre or keyword")
    .addStringOption((opt) =>
      opt
        .setName("query")
        .setDescription("Genre, style, or keyword (e.g. lofi, jazz, rock, 80s)")
        .setRequired(true),
    )
    .addIntegerOption((opt) =>
      opt
        .setName("limit")
        .setDescription("Max number of results (default: 10, max: 25)")
        .setMinValue(1)
        .setMaxValue(25)
        .setRequired(false),
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const searchQuery = interaction.options.getString("query").trim();
    const limit = interaction.options.getInteger("limit") || 5;

    log.info(`Radio search requested: "${searchQuery}" (limit: ${limit})`);

    try {
      // Use radio-browser.info API (free, no key needed)
      const response = await axios.get(
        "https://de1.api.radio-browser.info/json/stations/search",
        {
          params: {
            name: searchQuery,
            limit: limit,
            hidebroken: true,
            order: "clickcount",
            reverse: true,
          },
          timeout: 10000,
        },
      );

      const stations = response.data;

      if (!stations || stations.length === 0) {
        return interaction.editReply({
          content: `No radio stations found for "${searchQuery}". Try a different genre (e.g. lofi, jazz, rock, 80s).`,
          ephemeral: true,
        });
      }

      // Build dropdown menu
      const options = stations.slice(0, 25).map((station) => {
        const name =
          station.name.length > 80
            ? station.name.slice(0, 77) + "..."
            : station.name;
        return new StringSelectMenuOptionBuilder()
          .setLabel(name)
          .setDescription(
            `${station.tags || "No tags"} • ${station.bitrate || "?"}kbps`,
          )
          .setValue(station.url_resolved || station.url);
      });

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("radio_select")
        .setPlaceholder("Select a radio station to play")
        .addOptions(options);

      const row = new ActionRowBuilder().addComponents(selectMenu);

      const embed = new EmbedBuilder()
        .setColor(0x1abc9c)
        .setTitle(`📻 Radio Stations for "${searchQuery}"`)
        .setDescription(
          `Found **${stations.length}** stations. Pick one below to start streaming!`,
        )
        .setFooter({
          text: "Powered by radio-browser.info • Stations may go offline",
        })
        .setTimestamp();
      await interaction.editReply({
        embeds: [embed],
        components: [row],
        time: 15 * 60 * 1000, // longer timeout
      });

      const collector = interaction.channel.createMessageComponentCollector({
        filter: (i) => i.user.id === interaction.user.id,
        time: 15 * 60 * 1000,
      });

      collector.on("collect", async (i) => {
        // your play logic here
        await i.update({
          content: `Playing ${i.values[0]}...`,
          components: [],
        });
      });

      collector.on("end", (collected, reason) => {
        if (reason === "time") {
          interaction.followUp({ content: "Menu timed out.", ephemeral: true });
        }
      });
    } catch (err) {
      log.error("Radio search failed:", err.message);
      await interaction.editReply({
        content:
          "Failed to search for radio stations. Try again later or use /radio for preset stations.",
        ephemeral: true,
      });
    }
  },
};
