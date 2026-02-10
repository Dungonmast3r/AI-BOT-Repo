require("dotenv").config();

// index.js
const log = require("./handlers/logger");

const {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  MessageFlags,
} = require("discord.js");

const config = require("./config");
const { loadEvents, loadMusicEvents } = require("./handlers/eventHandler");
const { Player } = require("discord-player");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [Partials.Message, Partials.Channel],
});

const player = new Player(client);

client.commands = new Collection();
client.cooldowns = new Collection();
client.usersData = {};
client.conversationHistory = new Map();

loadEvents(client);
loadMusicEvents(player);

client.login(process.env.DISCORD_TOKEN);

process.on("SIGINT", async () => {
  log.success("Shutting down... saving data");
  await require("fs").promises.writeFile(
    "./data/users.json",
    JSON.stringify(client.usersData, null, 2),
  );
  process.exit(0);
});
