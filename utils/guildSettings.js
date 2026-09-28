const fs = require('node:fs');
const path = require('node:path');
const config = require('../config');

const defaults = Object.freeze({ aiEnabled: true, aiChannelId: config.aiChannelId || '',
  mentionOnly: config.mentionOnly !== false, musicEnabled: true, djRoleId: '',
  levelingEnabled: true, voiceXpEnabled: true, levelChannelId: config.levelChannelId || '' });
const ids = new Set(['aiChannelId', 'djRoleId', 'levelChannelId']);
function validate(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Settings must be an object.');
  const result = {};
  for (const [key, value] of Object.entries(input)) {
    if (!Object.hasOwn(defaults, key)) throw new Error(`Unknown setting: ${key}`);
    if (ids.has(key) ? typeof value !== 'string' || (value !== '' && !/^\d{17,20}$/.test(value)) : typeof value !== 'boolean') {
      throw new Error(`Invalid value for ${key}.`);
    }
    result[key] = value;
  }
  return result;
}
class SettingsStore {
  constructor(filename = path.join(__dirname, '../data/guild-settings.json')) {
    this.filename = filename;
    this.data = {};
    try {
      this.data = JSON.parse(fs.readFileSync(filename, 'utf8'));
      if (!this.data || Array.isArray(this.data) || typeof this.data !== 'object') throw new Error('Invalid settings file');
      for (const [id, settings] of Object.entries(this.data)) {
        if (!/^\d{17,20}$/.test(id)) throw new Error('Invalid guild ID');
        validate(settings);
      }
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  get(id) { return { ...defaults, ...this.data[id] }; }
  update(id, input) {
    if (!/^\d{17,20}$/.test(id)) throw new Error('Invalid guild ID');
    const next = { ...this.data, [id]: { ...this.get(id), ...validate(input) } };
    fs.mkdirSync(path.dirname(this.filename), { recursive: true });
    const tmp = this.filename + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(next, null, 2), { mode: 0o600 });
    fs.renameSync(tmp, this.filename);
    this.data = next;
    return this.get(id);
  }
}
let instance;
module.exports = { SettingsStore, defaults, validate, getStore: () => instance ||= new SettingsStore() };
