// utils/tempChannels.js
const tempChannels = new Map();

module.exports = {
  tempChannels,
  // Helper functions (optional but nice)
  getOwner: (channelId) => tempChannels.get(channelId),
  setOwner: (channelId, ownerId) => tempChannels.set(channelId, ownerId),
  remove: (channelId) => tempChannels.delete(channelId),
  has: (channelId) => tempChannels.has(channelId),
};
