const { GuildQueueEvent } = require("discord-player");
const log = require('../handlers/logger'); // Logger import
module.exports = {
  name: GuildQueueEvent.Error,
  async execute(queue, error) {
    log.error(`General player error event: ${error.message}`);
    log.error(error);
  },
};
