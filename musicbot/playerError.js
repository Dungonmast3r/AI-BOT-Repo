const { GuildQueueEvent } = require("discord-player");
const log = require('../handlers/logger'); // Logger import
module.exports = {
  name: GuildQueueEvent.PlayerError,
  async execute(queue, error) {
    log.error(`Player error event: ${error.message}`);
    log.error(error);
  },
};
