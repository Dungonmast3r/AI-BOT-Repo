// commands/owner/reload.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs').promises;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reload')
    .setDescription('[DEV] Reload commands, events or specific module')
    .addStringOption(option =>
      option
        .setName('type')
        .setDescription('What to reload')
        .setRequired(true)
        .addChoices(
          { name: 'All commands', value: 'commands' },
          { name: 'All events', value: 'events' },
          { name: 'Specific command', value: 'command' }
        )
    )
    .addStringOption(option =>
      option
        .setName('command_name')
        .setDescription('Command name to reload (only when type = command)')
        .setRequired(false)
        .setAutocomplete(true)
    ),

  devOnly: true, // we'll use this flag in the handler

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const type = interaction.options.getString('type');
    const commandName = interaction.options.getString('command_name');

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTimestamp()
      .setFooter({ text: `Requested by ${interaction.user.tag}` });

    try {
      if (type === 'commands') {
        // Clear old commands
        interaction.client.commands.clear();

        // Re-load
        const { loadCommands, registerCommands } = require('../../handlers/commandHandler');
        await loadCommands(interaction.client);
        await registerCommands(interaction.client);

        embed
          .setTitle('Reload Successful')
          .setDescription(`Reloaded **${interaction.client.commands.size}** commands.`);

      } else if (type === 'events') {
        // Discord.js doesn't have built-in event reload, so we approximate
        interaction.client.removeAllListeners(); // dangerous – clears everything!

        const { loadEvents } = require('../../handlers/eventHandler');
        await loadEvents(interaction.client);

        embed
          .setTitle('Events Reloaded')
          .setDescription('Events have been re-loaded.\n(Note: some listeners might need manual re-attachment)');
        // In practice, full event reload is tricky – often better to restart bot

      } else if (type === 'command' && commandName) {
        // Reload single command
        const command = interaction.client.commands.get(commandName);
        if (!command) {
          return interaction.editReply({
            embeds: [embed.setColor(0xED4245).setDescription(`Command **${commandName}** not found.`)],
          });
        }

        // Remove old version
        delete require.cache[require.resolve(command.__filename || '')];

        // Find and reload
        let reloaded = false;
        const commandsPath = path.join(__dirname, '../../commands');
        const folders = await fs.readdir(commandsPath);

        for (const folder of folders) {
          const folderPath = path.join(commandsPath, folder);
          const files = await fs.readdir(folderPath);
          const file = files.find(f => f === `${commandName}.js` || f.endsWith(`/${commandName}.js`));

          if (file) {
            const filePath = path.join(folderPath, file);
            const newCommand = require(filePath);

            interaction.client.commands.set(commandName, newCommand);
            reloaded = true;
            break;
          }
        }

        if (reloaded) {
          embed.setTitle('Command Reloaded').setDescription(`**/${commandName}** was successfully reloaded.`);
        } else {
          embed.setColor(0xED4245).setDescription(`Failed to find and reload **/${commandName}**.`);
        }
      } else {
        embed.setColor(0xED4245).setDescription('Invalid reload type or missing command name.');
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('[RELOAD ERROR]', error);
      await interaction.editReply({
        embeds: [embed.setColor(0xED4245).setDescription(`Error during reload:\n\`\`\`${error.message}\`\`\``)],
      });
    }
  },

  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused();
    const choices = Array.from(interaction.client.commands.keys());
    const filtered = choices.filter(choice => choice.startsWith(focusedValue)).slice(0, 25);

    await interaction.respond(
      filtered.map(choice => ({ name: choice, value: choice }))
    );
  },
};