const log = require("./logger");
const fs = require("node:fs");
const path = require("node:path");

async function loadEvents(client) {
const eventsPath = path.join(__dirname, '..', 'events');
  const eventFiles = ( fs.readdirSync(eventsPath)).filter((file) =>
    file.endsWith(".js"),
  );

  for (const file of eventFiles) {
    const event = require(path.join(eventsPath, file));
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }
  }
  log.success(`Loaded ${eventFiles.length} events`);
}
async function loadMusicEvents(player) {
  const musicEventsPath = path.join(__dirname, "..", "musicbot");
  const musicEventFiles = fs
    .readdirSync(musicEventsPath)
    .filter((file) => file.endsWith(".js"));

  for (const file of musicEventFiles) {
    const filePath = path.join(musicEventsPath, file);
    const event = require(filePath);
    player.events.on(event.name, (...args) => event.execute(...args));
  }
}

module.exports = { loadEvents, loadMusicEvents };
