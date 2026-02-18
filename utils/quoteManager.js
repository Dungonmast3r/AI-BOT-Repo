// utils/quoteManager.js
const fs = require('node:fs/promises');
const path = require('node:path');

const QUOTES_FILE = path.join(__dirname, '../data/quotes.json');

const quotesCache = new Map(); // guildId → array of quote objects

async function loadQuotes() {
  try {
    const data = await fs.readFile(QUOTES_FILE, 'utf8');
    const parsed = JSON.parse(data);
    for (const [guildId, quotes] of Object.entries(parsed)) {
      quotesCache.set(guildId, quotes);
    }
  } catch (err) {
    if (err.code !== 'ENOENT') console.error('Failed to load quotes:', err);
  }
}

async function saveQuotes() {
  try {
    const data = {};
    for (const [guildId, quotes] of quotesCache) {
      data[guildId] = quotes;
    }
    await fs.mkdir(path.dirname(QUOTES_FILE), { recursive: true });
    await fs.writeFile(QUOTES_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Failed to save quotes:', err);
  }
}

// Load on startup
loadQuotes();

// Auto-save every 5 minutes
setInterval(saveQuotes, 5 * 60 * 1000);

function getQuotes(guildId) {
  return quotesCache.get(guildId) || [];
}

function addQuote(guildId, quote) {
  if (!quotesCache.has(guildId)) quotesCache.set(guildId, []);
  quotesCache.get(guildId).push(quote);
}

function deleteQuote(guildId, quoteId) {
  const quotes = getQuotes(guildId);
  const index = quotes.findIndex(q => q.id === quoteId);
  if (index === -1) return false;
  quotes.splice(index, 1);
  return true;
}

module.exports = {
  getQuotes,
  addQuote,
  deleteQuote,
  saveQuotes,
};