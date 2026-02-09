const log = require('../handlers/logger');
// handlers/commandHandler.js
const fs = require('fs').promises;
const path = require('path');

async function loadCommands(client) {
  client.commands = new Map();
  const commandsPath = path.join(__dirname, '../commands');

  let totalLoaded = 0;

  try {
    const commandFolders = await fs.readdir(commandsPath);

    for (const folder of commandFolders) {
      const folderPath = path.join(commandsPath, folder);
      const stat = await fs.stat(folderPath);

      if (!stat.isDirectory()) continue;

      const commandFiles = (await fs.readdir(folderPath)).filter(file => file.endsWith('.js'));

      for (const file of commandFiles) {
        try {
          const filePath = path.join(folderPath, file);
          const command = require(filePath);

          if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            totalLoaded++;
          } else {
            log.warn(`[COMMAND WARNING] ${file} is missing "data" or "execute"`);
          }
        } catch (loadErr) {
          log.error(`[COMMAND LOAD ERROR] Failed to load ${file}:`, loadErr.message);
        }
      }
    }

    log.success(`Loaded ${totalLoaded} commands`);
  } catch (err) {
    log.error('Error scanning commands folder:', err.message);
  }
}

async function registerCommands(client) {
  if (!client.commands || client.commands.size === 0) {
    log.warn('No commands loaded – skipping global registration');
    return;
  }

  const commandsData = Array.from(client.commands.values()).map(cmd => cmd.data.toJSON());

  try {
    await client.application.commands.set(commandsData);
    log.success(`Successfully registered ${commandsData.length} slash commands globally`);
  } catch (err) {
    log.error('Failed to register slash commands:', err.message);
  }
}

module.exports = { loadCommands, registerCommands };