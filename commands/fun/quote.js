// commands/fun/quote.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getQuotes, addQuote, deleteQuote } = require('../../utils/quoteManager');
const log = require('../../handlers/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('quote')
    .setDescription('Manage saved quotes')
    .addSubcommand(sub =>
      sub
        .setName('add')
        .setDescription('Save a message as a quote')
        .addStringOption(opt => opt.setName('message').setDescription('The quote text (or reply to a message)').setRequired(false))
        .addStringOption(opt => opt.setName('note').setDescription('Optional note/context').setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('random').setDescription('Show a random quote')
    )
    .addSubcommand(sub =>
      sub
        .setName('list')
        .setDescription('List all quotes')
        .addIntegerOption(opt => opt.setName('page').setDescription('Page number').setMinValue(1).setRequired(false))
    )
    .addSubcommand(sub =>
      sub
        .setName('delete')
        .setDescription('Delete a quote by ID (admin only)')
        .addStringOption(opt => opt.setName('id').setDescription('Quote ID').setRequired(true))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'add') {
      await interaction.deferReply({ ephemeral: true });

      const messageText = interaction.options.getString('message');
      const note = interaction.options.getString('note') || null;

      let content = messageText;
      let imageUrls = null;

      // If no text provided, try to use replied message
      if (!content) {
        let quotedMessage = interaction.reference?.messageId;
        if (quotedMessage) quotedMessage = await interaction.channel.messages.fetch(quotedMessage).catch(() => null);

        if (!quotedMessage) {
          return interaction.editReply({ content: 'Provide quote text or reply to a message.', ephemeral: true });
        }

        content = quotedMessage.content || '[No text content]';
        imageUrls = quotedMessage.attachments
          .filter(att => att.contentType?.startsWith('image/'))
          .map(att => att.url);
      }

      if (!content.trim()) {
        return interaction.editReply({ content: 'Quote cannot be empty.', ephemeral: true });
      }

      const quote = {
        id: Date.now().toString(),
        content: content.trim(),
        author: interaction.user.tag, // or "Anonymous" if you want
        authorId: interaction.user.id,
        timestamp: Date.now(),
        quotedBy: interaction.user.id,
        note,
        imageUrls: imageUrls || null,
      };

      addQuote(interaction.guild.id, quote);

      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('Quote Saved')
        .setDescription(`"${quote.content}"\n— ${quote.author}`)
        .setFooter({ text: `ID: ${quote.id} • Saved by ${interaction.user.tag}` })
        .setTimestamp(quote.timestamp);

      if (quote.imageUrls?.length > 0) {
        embed.setImage(quote.imageUrls[0]); // show first image large
      }

      await interaction.editReply({ embeds: [embed] });
      log.success(`Quote added by ${interaction.user.tag}: ${quote.content.slice(0, 50)}...`);
    }

    // ... rest of your subcommands (random, list, delete) remain the same ...
    // (paste your existing random/list/delete code here if you want them in one file)
  },
};