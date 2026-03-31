// events/voiceStateUpdate.js
const { Events, PermissionFlagsBits, ChannelType } = require("discord.js");
const config = require("../config");
const log = require("../handlers/logger");
const levelManager = require("../utils/levelManager");

// Temp Channels Map
const tempChannels = new Map();
module.exports.tempChannels = tempChannels;

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
      autoDeleteDelay = 5000,
    } = tempVoice || {};

    if (!enabledGuilds?.includes(guild.id)) return;

    // ========================
    // VOICE XP SYSTEM
    // ========================
    const isNowInVC = newChannel !== null;
    const wasInVC = oldChannel !== null;

    if (!member.user.bot) {
      // User joined voice
      if (!wasInVC && isNowInVC) {
        if (!newState.mute && !newState.deaf) {
          levelManager.startVoiceXP(guild.id, member.id);
        }
      }

      // User left voice or became muted/deafened
      if (wasInVC && (!isNowInVC || newState.mute || newState.deaf)) {
        levelManager.stopVoiceXP(guild.id, member.id);
      }

      // User unmuted/undeafened while in VC
      if (
        isNowInVC &&
        !newState.mute &&
        !newState.deaf &&
        !levelManager.isEarningVoiceXP(guild.id, member.id)
      ) {
        levelManager.startVoiceXP(guild.id, member.id);
      }
    }

    // ========================
    // TEMP CHANNEL SYSTEM
    // ========================
    if (
      newChannel?.id === triggerChannelId &&
      oldChannel?.id !== triggerChannelId
    ) {
      // One temp channel per user check
      let existingChannelId = null;
      for (const [chId, ownerId] of tempChannels) {
        if (ownerId === member.id) {
          existingChannelId = chId;
          break;
        }
      }

      if (existingChannelId) {
        const existingChannel = await guild.channels
          .fetch(existingChannelId)
          .catch(() => null);
        if (existingChannel) {
          await member.voice.setChannel(existingChannel).catch(() => {});
          return member
            .send(
              `❌ You already have an active temp channel: **${existingChannel.name}**\nWait until it is deleted before creating another.`,
            )
            .catch(() => {});
        } else {
          tempChannels.delete(existingChannelId);
        }
      }

      log.info(`Temp VC Trigger: ${member.user.tag} joined trigger channel`);

      try {
        const channelName = channelPrefix.replace(
          "{username}",
          member.user.username,
        );

        const tempChannel = await guild.channels.create({
          name: channelName,
          type: ChannelType.GuildVoice,
          parent: categoryId || newChannel?.parentId,
          permissionOverwrites: [
            { id: guild.id, deny: [PermissionFlagsBits.Connect] },
            {
              id: guild.client.user.id,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.Connect,
                PermissionFlagsBits.ManageChannels,
              ],
            },
          ],
        });

        await member.voice.setChannel(tempChannel);

        tempChannels.set(tempChannel.id, member.id);

        log.success(
          `✅ Created temp channel: ${tempChannel.name} | Owner: ${member.user.tag}`,
        );

        await tempChannel.send({
          content: `✅ Welcome, **${member}**!\nThis is your private voice room.\nIt will be deleted automatically when everyone leaves.`,
        });
      } catch (err) {
        log.error("Failed to create temp voice channel:", err);
        member.send("❌ Failed to create your private room.").catch(() => {});
      }
    }

    // Auto delete empty temp channel
    if (oldChannel && tempChannels.has(oldChannel.id)) {
      setTimeout(async () => {
        try {
          const channel = await guild.channels
            .fetch(oldChannel.id)
            .catch(() => null);
          if (channel && channel.members.size === 0) {
            await channel.delete();
            log.info(`🗑️ Auto-deleted empty temp channel: ${channel.name}`);
            tempChannels.delete(oldChannel.id);
          }
        } catch (err) {
          if (err.code !== 10058) {
            log.error("Failed to delete temp channel:", err);
          }
          tempChannels.delete(oldChannel.id);
        }
      }, autoDeleteDelay);
    }
  },
};
