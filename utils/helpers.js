// utils/helpers.js
const config = require('../config');

function prepareSafeContent(text) {
  if (text.length <= config.maxEmbedLength) {
    return { text, isTooLong: false };
  }
  const truncated = text.substring(0, config.maxEmbedLength - 80) +
    '\n\n... (clipped – say "continue" for more lore)';
  return { text: truncated, isTooLong: true };
}

function getLevel(xp) {
  return Math.floor(Math.sqrt(xp / 100));
}

function xpForNextLevel(level) {
  return Math.ceil((level + 1) ** 2 * 100);
}

module.exports = { prepareSafeContent, getLevel, xpForNextLevel };