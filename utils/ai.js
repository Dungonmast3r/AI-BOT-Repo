// utils/ai.js
const Groq = require('groq-sdk');
const config = require('../config');
const log = require('../handlers/logger'); // <--- Logger import

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Helper to get a random personality from config
function getRandomPersonality() {
  if (!config.personalities || config.personalities.length === 0) {
    // Fallback if array is empty
    return { name: "Default Dungeon", prompt: config.personality };
  }
  const randomIndex = Math.floor(Math.random() * config.personalities.length);
  return config.personalities[randomIndex];
}

async function getAIResponse(historyMap, userId, userMessage, customPersonality = null) {
  let history = historyMap.get(userId) || [];

  // Use provided personality or pick random from config
  const personality = customPersonality || getRandomPersonality();

  const messages = [
    { role: 'system', content: personality.prompt },
    ...history.map(msg => ({
      role: msg.role === 'model' ? 'assistant' : 'user',
      content: msg.parts[0].text
    })),
    { role: 'user', content: userMessage }
  ];

  log.info(`AI request from user ${userId} (personality: ${personality.name}): "${userMessage}"`);

  try {
    const completion = await groq.chat.completions.create({
      messages,
      model: 'llama-3.3-70b-versatile',
      temperature: 0.92,
      max_tokens: 180,
      top_p: 0.95,
    });

    const text = completion.choices[0]?.message?.content?.trim() 
      || "GPU existential crisis... brb";

    history.push({ role: 'user', parts: [{ text: userMessage }] });
    history.push({ role: 'model', parts: [{ text }] });

    if (history.length > 8) {
      history = history.slice(-8);
      log.debug(`Trimmed history for user ${userId} to 8 messages`);
    }

    historyMap.set(userId, history);

    //log.success(`AI response sent to user ${userId} (length: ${text.length} chars)`);
    return text;

  } catch (err) {
    log.error('Groq API error', {
      userId,
      message: userMessage,
      error: err.message || err,
      stack: err.stack
    });
    throw err;
  }
}

module.exports = { getAIResponse };