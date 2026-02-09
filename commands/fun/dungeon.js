// commands/fun/dungeon.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getAIResponse } = require('../../utils/ai');
const { prepareSafeContent } = require('../../utils/helpers');
const log = require('../../handlers/logger'); // Logger import

// Log when the command module is loaded (startup info)
//log.info('Dungeon command loaded');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dungeon')
    .setDescription('Chat with Dungeon the gamer AI 🎮')
    .addStringOption(opt =>
      opt.setName('message')
        .setDescription('Your message to the dungeon master')
        .setRequired(true)
    ),

  async execute(interaction) {
    // Defer reply immediately to prevent "Unknown Interaction" timeout
    await interaction.deferReply();

    const userMsg = interaction.options.getString('message');
    const userId = interaction.user.id;

    //log.info(`Dungeon command used by ${interaction.user.tag} (${userId}): "${userMsg}"`);

    try {
      const response = await getAIResponse(interaction.client.conversationHistory, userId, userMsg);
      const safe = prepareSafeContent(response);

      //log.debug(`AI response generated for ${userId} (length: ${response.length} chars)`);

      if (safe.isTooLong) {
        // If message is too long for embed → send as plain text
        await interaction.editReply(safe.text);
        log.warn(`Response was too long for embed (${response.length} chars), sent as text`);
      } else {
        await interaction.editReply({
          embeds: [new EmbedBuilder()
            .setDescription(safe.text)
            .setColor(0x00AA00)
            .setFooter({ text: 'Dungeon Master 🎮 | gg no re' })
            .setTimestamp()
          ]
        });
        //log.success(`Dungeon response sent to ${interaction.user.tag}`);
      }

    } catch (err) {
      log.error('Dungeon command failed', {
        userId,
        message: userMsg,
        error: err.message,
        stack: err.stack
      });

      const errorEmbed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('Dungeon Error')
        .setDescription('The dungeon master is having a crisis... try again later 😅');

      // Safe error reply (edit if deferred, fallback to reply)
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errorEmbed], ephemeral: true }).catch(() => {});
      } else {
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true }).catch(() => {});
      }
    }
  },
};