const { GuildQueueEvent } = require("discord-player");
const log = require("../handlers/logger");
module.exports = {
    name: GuildQueueEvent.PlayerStart,
    async execute(queue, track) {
        const { channel } = queue.metadata;
        log.info(`▶️ Now playing: **${track.title}**`);
    }
}