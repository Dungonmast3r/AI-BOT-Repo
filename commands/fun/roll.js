// commands/fun/roll.js
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roll')
    .setDescription('Roll dice (e.g. 1d20, 4d6)')
    .addStringOption(opt => opt.setName('dice').setDescription('Dice notation (default: 1d6)').setRequired(false)),

  async execute(interaction) {
    let dice = interaction.options.getString('dice') || '1d6';
    const match = dice.match(/^(\d+)d(\d+)$/i);

    if (!match) {
      return interaction.reply({ content: 'Invalid dice format! Use NdM (e.g. 2d20)', ephemeral: true });
    }

    const num = parseInt(match[1]);
    const sides = parseInt(match[2]);

    if (num < 1 || num > 100 || sides < 2 || sides > 1000) {
      return interaction.reply({ content: 'Dice must be between 1-100 rolls and 2-1000 sides!', ephemeral: true });
    }

    let total = 0;
    const rolls = [];
    for (let i = 0; i < num; i++) {
      const roll = Math.floor(Math.random() * sides) + 1;
      rolls.push(roll);
      total += roll;
    }

    await interaction.reply(`🎲 Rolled **${num}d${sides}**: ${rolls.join(', ')} = **${total}**`);
  },
};