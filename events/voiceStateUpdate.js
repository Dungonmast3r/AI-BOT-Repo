// events/voiceStateUpdate.js
const { Events } = require('discord.js');
const config = require('../config'); // <--- Load from config file
const log = require('../handlers/logger');

module.exports = {
  name: Events.voiceStateUpdate,
  async execute(oldState, newState) {
    const { guild, member, channel: newChannel } = newState;
    const { channel: oldChannel } = oldState;

    // Load settings from config.js
    const { tempVoice } = config;
    const { enabledGuilds, triggerChannelId, categoryId, channelPrefix, autoDeleteDelay } = tempVoice;

    log.debug(`Voice update in guild ${guild.id} (${guild.name}): ${member.user.tag} moved from ${oldChannel?.name || 'none'} → ${newChannel?.name || 'none'}`);

    // Only run if feature is enabled for this guild
    if (!enabledGuilds.includes(guild.id)) {
      log.debug(`Temp voice disabled for guild ${guild.id}`);
      return;
    }

    log.debug(`Temp voice enabled. Trigger channel ID: ${triggerChannelId}`);

    // User JOINED the trigger channel (and wasn't already in it)
    if (newChannel?.id === triggerChannelId && oldChannel?.id !== triggerChannelId) {
      log.info(`Trigger detected: ${member.user.tag} joined trigger channel in ${guild.name}`);

      try {
        // Create new temp channel
        const channelOptions = {
          name: channelPrefix.replace('{username}', member.user.username),
          type: 2, // voice channel
          parent: categoryId || newChannel.parentId,
          permissionOverwrites: [
            // Copy permissions from trigger channel
            ...newChannel.permissionOverwrites.cache.map(overwrite => ({
              id: overwrite.id,
              allow: overwrite.allow.toArray(),
              deny: overwrite.deny.toArray(),
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
        await tempChannel.send(`Welcome, ${member}! This is your private room.\nIt will auto-delete when empty.`);

        // Auto-delete when empty
        const cleanup = () => {
          if (tempChannel.members.size === 0) {
            setTimeout(async () => {
              if (tempChannel.members.size === 0) {
                try {
                  await tempChannel.delete();
                  log.info(`Deleted empty temp channel: ${tempChannel.name}`);
                } catch (err) {
                  log.error('Failed to delete temp channel:', err);
                }
              }
            }, autoDeleteDelay);
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
    if (oldChannel?.id === triggerChannelId && (!newChannel || newChannel.id !== triggerChannelId)) {
      log.debug(`User ${member.user.tag} left trigger channel`);
      // Add logic here if needed
    }
  },
};