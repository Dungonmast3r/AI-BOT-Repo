// events/voiceStateUpdate.js
const { Events, PermissionFlagsBits, ChannelType } = require('discord.js');
const config = require('../config');
const log = require('../handlers/logger');
const { tempChannels, setOwner, remove } = require('../utils/tempChannels');   // ← New import

module.exports = {
    name: Events.VoiceStateUpdate,
    async execute(oldState, newState) {
        const { guild, member } = newState;
        const newChannel = newState.channel;
        const oldChannel = oldState.channel;

        const { tempVoice } = config || {};
        const { 
            enabledGuilds, 
            triggerChannelId, 
            categoryId, 
            channelPrefix = "{username}'s Room", 
            autoDeleteDelay = 5000 
        } = tempVoice || {};

        if (!enabledGuilds?.includes(guild.id)) return;

        // CREATE TEMP CHANNEL
        if (newChannel?.id === triggerChannelId && oldChannel?.id !== triggerChannelId) {

            // One temp channel per user check
            let existing = false;
            for (const [chId, ownerId] of tempChannels) {
                if (ownerId === member.id) {
                    existing = chId;
                    break;
                }
            }

            if (existing) {
                const existingChannel = await guild.channels.fetch(existing).catch(() => null);
                if (existingChannel) {
                    await member.voice.setChannel(existingChannel).catch(() => {});
                    return member.send(`❌ You already have an active temp channel: **${existingChannel.name}**\nWait until it is deleted before creating another.`).catch(() => {});
                } else {
                    tempChannels.delete(existing);
                }
            }

            log.info(`Temp VC Trigger: ${member.user.tag} joined trigger channel`);

            try {
                const channelName = channelPrefix.replace('{username}', member.user.username);

                const tempChannel = await guild.channels.create({
                    name: channelName,
                    type: ChannelType.GuildVoice,
                    parent: categoryId || newChannel?.parentId,
                    permissionOverwrites: [
                        { id: guild.id, deny: [PermissionFlagsBits.Connect] },
                        { 
                            id: guild.client.user.id, 
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.ManageChannels] 
                        },
                    ],
                });

                await member.voice.setChannel(tempChannel);

                setOwner(tempChannel.id, member.id);   // Use helper

                log.success(`✅ Created temp channel: ${tempChannel.name} | Owner: ${member.user.tag}`);

                await tempChannel.send({
                    content: `✅ Welcome, **${member}**!\nThis is your private voice room.\nIt will be deleted automatically when everyone leaves.`
                });

            } catch (err) {
                log.error('Failed to create temp voice channel:', err);
            }
        }

        // AUTO DELETE
        if (oldChannel && tempChannels.has(oldChannel.id)) {
            setTimeout(async () => {
                try {
                    const channel = await guild.channels.fetch(oldChannel.id).catch(() => null);
                    if (channel && channel.members.size === 0) {
                        await channel.delete();
                        log.info(`🗑️ Auto-deleted empty temp channel: ${channel.name}`);
                        remove(oldChannel.id);
                    }
                } catch (err) {
                    if (err.code !== 10058) log.error('Failed to delete temp channel:', err);
                    remove(oldChannel.id);
                }
            }, autoDeleteDelay);
        }
    },
};