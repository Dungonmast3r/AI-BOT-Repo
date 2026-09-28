const { test } = require('node:test');
const assert = require('node:assert/strict');
const settingsModule = require('../utils/guildSettings');
let settings = { ...settingsModule.defaults };
settingsModule.getStore = () => ({ get: () => settings });
const { denial } = require('../utils/settingsPolicy');
test('music commands, buttons and radio selections enforce feature and DJ policy', async () => {
  const interaction = { guild: { id: 'guild', members: { fetch: async () => ({ permissions: { has: () => false }, roles: { cache: new Map() } }) } }, user: { id: 'user' }, commandName: 'play' };
  settings.musicEnabled = false; assert.match(await denial(interaction), /disabled/);
  interaction.commandName = undefined; interaction.customId = 'music_skip'; assert.match(await denial(interaction), /disabled/);
  interaction.customId = 'radio_select'; assert.match(await denial(interaction), /disabled/);
  settings.musicEnabled = true; settings.djRoleId = 'dj'; assert.match(await denial(interaction), /DJ role/);
  interaction.guild.members.fetch = async () => ({ permissions: { has: () => true } }); assert.equal(await denial(interaction), null);
  interaction.guild.members.fetch = async () => ({ permissions: { has: () => false }, roles: { cache: new Map([['dj', {}]]) } }); assert.equal(await denial(interaction), null);
  settings = { ...settingsModule.defaults, aiEnabled: false, levelingEnabled: false };
  delete interaction.customId; interaction.commandName = 'dungeon'; assert.match(await denial(interaction), /AI is disabled/);
  interaction.commandName = 'level'; assert.match(await denial(interaction), /Leveling is disabled/);
});
test('text XP honors settings and uses a server-specific cooldown and destination', async () => {
  const awards = [], sent = [];
  const filename = require.resolve('../utils/levelManager');
  require.cache[filename] = { id: filename, filename, loaded: true, exports: { addXP: (...args) => { awards.push(args); return { leveledUp: true, newLevel: 2 }; } } };
  const event = require('../events/messageCreate');
  const message = { author: { id: 'user', bot: false }, guild: { id: 'one', channels: { cache: new Map([['announcements', { send: async text => sent.push(text) }]]) } }, channel: { send: async () => { throw new Error('Wrong destination'); } } };
  settings = { ...settingsModule.defaults, levelingEnabled: false, levelChannelId: 'announcements' };
  await event.execute(message); assert.equal(awards.length, 0);
  settings.levelingEnabled = true; await event.execute(message); await event.execute(message); assert.equal(awards.length, 1);
  message.guild.id = 'two'; await event.execute(message); assert.equal(awards.length, 2); assert.equal(sent.length, 2);
});
