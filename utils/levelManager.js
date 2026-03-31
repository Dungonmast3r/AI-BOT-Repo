// utils/levelManager.js
const SQLite = require("better-sqlite3");
const db = new SQLite("./levels.sqlite");
const voiceIntervals = new Map();
module.exports.voiceIntervals = voiceIntervals; // Make sure it's exported

module.exports = {
  init() {
    db.prepare(
      `
            CREATE TABLE IF NOT EXISTS levels (
                userId TEXT,
                guildId TEXT,
                xp INTEGER DEFAULT 0,
                level INTEGER DEFAULT 1,
                PRIMARY KEY (userId, guildId)
            )
        `,
    ).run();

    console.log("✅ Levels database initialized");
  },

  getUser(guildId, userId) {
    return (
      db
        .prepare("SELECT * FROM levels WHERE guildId = ? AND userId = ?")
        .get(guildId, userId) || { xp: 0, level: 1 }
    );
  },

  addXP(guildId, userId, xpAmount) {
    let user = this.getUser(guildId, userId);
    const newXP = user.xp + xpAmount;

    const newLevel = Math.floor(0.1 * Math.sqrt(newXP));

    db.prepare(
      `
            INSERT INTO levels (guildId, userId, xp, level)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(userId, guildId) DO UPDATE SET
            xp = excluded.xp,
            level = excluded.level
        `,
    ).run(guildId, userId, newXP, newLevel);

    const leveledUp = newLevel > user.level;
    return { leveledUp, newLevel, newXP, oldLevel: user.level };
  },

  getLeaderboard(guildId, limit = 10) {
    return db
      .prepare(
        `
            SELECT userId, xp, level 
            FROM levels 
            WHERE guildId = ? 
            ORDER BY xp DESC 
            LIMIT ?
        `,
      )
      .all(guildId, limit);
  },

  // ==================== VOICE XP SYSTEM ====================
  voiceIntervals: new Map(), // guildId => Set<userId>

  startVoiceXP(guildId, userId) {
    if (!this.voiceIntervals.has(guildId)) {
      this.voiceIntervals.set(guildId, new Set());
    }
    this.voiceIntervals.get(guildId).add(userId);
  },

  stopVoiceXP(guildId, userId) {
    const users = this.voiceIntervals.get(guildId);
    if (users) {
      users.delete(userId);
      if (users.size === 0) this.voiceIntervals.delete(guildId);
    }
  },

  isEarningVoiceXP(guildId, userId) {
    return this.voiceIntervals.get(guildId)?.has(userId) || false;
  },
};
