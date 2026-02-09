// commands/fun/quiz.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getAIResponse } = require('../../utils/ai');
const log = require('../../handlers/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('quiz')
    .setDescription('Get a random AI-generated trivia question')
    .addStringOption(opt => opt.setName('topic').setDescription('Topic (optional)').setRequired(false)),

  async execute(interaction) {
    await interaction.deferReply();

    const topic = interaction.options.getString('topic') || 'random';
    const prompt = `Generate a fun, medium-difficulty trivia question about "${topic}". Format exactly:
Question: [question]
A) [option]
B) [option]
C) [option]
D) [option]
Answer: [correct letter] - [explanation]`;

    try {
      const quiz = await getAIResponse(new Map(), 'quiz-session', prompt);

      // Split question and answer part
      const [questionPart, answerPart] = quiz.split('Answer:');
      const question = questionPart.trim();
      const answer = answerPart ? answerPart.trim() : 'No answer provided';

      // Extract the correct letter (e.g. "A - ..." → "A")
      const correctLetter = answer.split(' - ')[0].trim().toUpperCase();

      const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('🧠 AI Trivia Challenge')
        .setDescription(question)
        .setFooter({ text: 'Reply with A, B, C, or D in the channel! 30 seconds...' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

      // Collector for replies
      const filter = m =>
        m.channel.id === interaction.channel.id &&
        ['a', 'b', 'c', 'd'].includes(m.content.trim().toLowerCase()) &&
        !m.author.bot;

      const collector = interaction.channel.createMessageCollector({
        filter,
        time: 30000, // 30 seconds
      });

      collector.on('collect', m => {
        const userAnswer = m.content.trim().toUpperCase();

        let result = '';
        if (userAnswer === correctLetter) {
          result = '✅ Correct! Great job!';
        } else {
          result = `❌ Wrong! The answer was **${correctLetter}**`;
        }

        m.reply(result);
      });

      collector.on('end', collected => {
        let content = 'Time\'s up! No one answered.';
        if (collected.size > 0) {
          content = `Quiz ended! ${collected.size} answer(s) received.`;
        }

        // Reveal answer to everyone
        interaction.followUp({
          embeds: [
            new EmbedBuilder()
              .setColor(0x3498db)
              .setTitle('Quiz Answer')
              .setDescription(`**Correct answer**: ${answer}`)
              .setTimestamp()
          ],
          content: content
        });
      });

      log.success(`Trivia question generated on "${topic}"`);
    } catch (err) {
      log.error('Quiz failed:', err);
      await interaction.editReply({ content: 'The AI forgot everything...', ephemeral: true });
    }
  },
};