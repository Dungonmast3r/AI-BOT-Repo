// events/ready.js
const { Events } = require("discord.js");
const fs = require("node:fs/promises");
const {
  loadCommands,
  registerCommands,
} = require("../handlers/commandHandler");
const path = require("node:path");
// Logger import
const log = require("../handlers/logger");
const { extractor } = require("../functions/extractors");

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    await extractor();
    log.success(`Logged in as ${client.user.tag} 🚀`);
    const PlayerContext = require("../structures/PlayerContext");
    client.playerCtx = new PlayerContext(client);
    log.success("Player context initialized");

    // Suppress canvas-related "Not implemented" warnings
    const originalWarn = process.emitWarning;
    process.emitWarning = function (warning, ...args) {
      if (
        typeof warning === "string" &&
        warning.includes("Not implemented: HTMLCanvasElement's getContext()")
      ) {
        return; // ignore this specific warning
      }
      return originalWarn.apply(process, [warning, ...args]);
    };

    // Suppress the specific YoutubeExtractor scraping warning
    const originalEmit = process.emit;
    process.emit = function (event, warning) {
      if (
        event === "warning" &&
        warning?.message?.includes("YoutubeExtractor")
      ) {
        return true; // silently ignore
      }
      return originalEmit.apply(process, arguments);
    };

    // ────────────────────────────────────────────────
    // Load & register commands
    // ────────────────────────────────────────────────
    await loadCommands(client);
    await registerCommands(client);

    // ────────────────────────────────────────────────
    // Load users data
    // ────────────────────────────────────────────────
    try {
      const rawData = await fs.readFile("./data/users.json", {
        encoding: "utf8",
      });

      if (!rawData.trim()) {
        log.info("users.json is empty → starting with fresh data");
        client.usersData = {};
      } else {
        client.usersData = JSON.parse(rawData);
        log.success("Users data loaded successfully");
      }
    } catch (err) {
      if (err.code === "ENOENT") {
        log.info("No users.json found → starting fresh");
        client.usersData = {};
      } else if (err instanceof SyntaxError) {
        log.error(
          "users.json contains invalid JSON → starting fresh and backing up broken file",
        );
        log.error("Error details:", err.message);

        try {
          await fs.rename(
            "./data/users.json",
            `./data/users-broken-${Date.now()}.json`,
          );
          log.warn("Renamed broken users.json to users-broken-...");
        } catch (renameErr) {
          log.error("Could not rename broken file:", renameErr.message);
        }

        client.usersData = {};
      } else {
        log.error("Unexpected error loading users.json:", err.message);
        client.usersData = {};
      }
    }

    client.usersData = client.usersData || {};

    // Auto-save every 30 seconds (correct promise-style)
    setInterval(async () => {
      try {
        const dataToSave = JSON.stringify(client.usersData, null, 2);

        await fs.writeFile("./data/users.json", dataToSave, {
          encoding: "utf8",
        });

        //log.success("Users data auto-saved successfully");
      } catch (err) {
        log.error("Auto-save failed", {
          message: err.message,
          code: err.code || "UNKNOWN",
          stack: err.stack,
        });
      }
    }, 30000);
  },
};
