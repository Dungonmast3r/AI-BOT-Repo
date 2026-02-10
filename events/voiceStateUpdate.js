// events/voiceStateUpdate.js
const { Events } = require('discord.js');
const config = require('../config');
const log = require('../handlers/logger');

module.exports = {
  name: Events.voiceStateUpdate,
  async execute(oldState, newState) {
    const { guild, member, channel: newChannel } = newState;
    const { channel: oldChannel } = oldState; // oldState has the previous channel

    // Only run if feature is enabled for this guild
    if (!config.tempVoice.enabledGuilds.includes(guild.id)) return;

    const triggerChannelId = config.tempVoice.triggerChannelId;

    // User JOINED the trigger channel (and wasn't already in it)
    if (newChannel?.id === triggerChannelId && oldChannel?.id !== triggerChannelId) {
      try {
        log.info(`User ${member.user.tag} joined trigger channel in ${guild.name}`);

        // Create new temp channel
        const channelOptions = {
          name: config.tempVoice.channelPrefix.replace('{username}', member.user.username),
          type: 2, // voice channel
          parent: config.tempVoice.categoryId || newChannel.parentId,
          permissionOverwrites: [
            // Copy permissions from trigger channel
            ...newChannel.permissionOverwrites.cache.map(overwrite => ({
              id: overwrite.id,
              allow: overwrite.allow,
              deny: overwrite.deny,
            })),
            // Give the user full control
            {
              id: member.id,
              allow: [
                'CONNECT', 'SPEAK', 'STREAM', 'VIEW_CHANNEL',
                'MANAGE_CHANNELS', 'MOVE_MEMBERS', 'MUTE_MEMBERS', 'DEAFEN_MEMBERS'
              ],
            },
            // Deny @everyone (makes it private)
            {
              id: guild.id,
              deny: ['CONNECT'],
            },
          ],
        };

        const tempChannel = await guild.channels.create(channelOptions);

        // Move user to the new channel
        await member.voice.setChannel(tempChannel);

        // Log & welcome message
        log.success(`Created temp channel "${tempChannel.name}" for ${member.user.tag}`);
        tempChannel.send(`Welcome, ${member}! This is your private room.\nIt will auto-delete when empty.`);

        // Auto-delete when empty
        const cleanup = () => {
          if (tempChannel.members.size === 0) {
            setTimeout(async () => {
              if (tempChannel.members.size === 0) {
                await tempChannel.delete().catch(err => log.error('Failed to delete temp channel:', err));
                log.info(`Deleted empty temp channel: ${tempChannel.name}`);
              }
            }, config.tempVoice.autoDeleteDelay);
          }
        };

        tempChannel.on('guildMemberRemove', cleanup);
        tempChannel.on('guildMemberUpdate', cleanup); // in case voice state changes

      } catch (err) {
        log.error('Temp channel creation failed:', err);
        member.send('Failed to create your private room. Contact an admin.').catch(() => {});
      }
    }

    // Optional: Cleanup if user leaves the trigger channel (rarely needed)
    // if (oldChannel?.id === triggerChannelId && (!newChannel || newChannel.id !== triggerChannelId)) {
    //   // Add logic here if you want to do something when user leaves without joining a temp channel
    // }
  },
};