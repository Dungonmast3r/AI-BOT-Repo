const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { PermissionFlagsBits } = require('discord.js');
const { getStore, validate } = require('../utils/guildSettings');
const random = () => crypto.randomBytes(32).toString('hex');
const fail = (status, message) => Object.assign(new Error(message), { status });
const canManage = guild => guild.owner || (BigInt(guild.permissions || '0') & 40n) !== 0n;

function createDashboard(client, options = {}) {
  const env = options.env || process.env;
  const store = options.store || getStore();
  const request = options.fetch || fetch;
  const origin = new URL(env.DASHBOARD_URL || 'http://localhost:3000');
  if (origin.pathname !== '/' || origin.search || origin.hash || origin.username || origin.password) throw new Error('DASHBOARD_URL must be an origin without a path.');
  if (origin.protocol !== 'https:' && !(origin.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(origin.hostname))) throw new Error('Use HTTPS for a public dashboard.');
  if (!env.DISCORD_CLIENT_ID || !env.DISCORD_CLIENT_SECRET) throw new Error('Dashboard requires DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET.');
  const sessions = new Map();
  const cookieName = origin.protocol === 'https:' ? '__Host-dungeon' : 'dungeon';
  const redirectUri = origin.origin + '/auth/callback';
  const cookie = (id, age = 3600) => `${cookieName}=${id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${origin.protocol === 'https:' ? '; Secure' : ''}`;
  const prune = setInterval(() => { for (const [id, s] of sessions) if (s.expires <= Date.now()) sessions.delete(id); }, 60000);
  prune.unref();
  async function discord(route, token, init = {}) {
    const response = await request('https://discord.com/api/v10' + route, {
      ...init, headers: { Authorization: `Bearer ${token}`, ...init.headers }, signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw fail(response.status === 401 ? 401 : 503, response.status === 401 ? 'Session expired. Sign in again.' : 'Discord is unavailable. Please try again shortly.');
    return response.json();
  }
  async function guilds(s) {
    const result = [];
    let after = '0';
    for (let page = 0; page < 10; page++) {
      const batch = await discord(`/users/@me/guilds?limit=200&after=${after}`, s.token);
      result.push(...batch);
      if (batch.length < 200) break;
      after = batch[batch.length - 1].id;
    }
    return result.filter(g => canManage(g) && client.guilds.cache.has(g.id));
  }
  async function authorizedGuild(s, id) {
    if (!(await guilds(s)).some(g => g.id === id)) throw fail(403, 'Manage Server permission and bot membership are required.');
    const guild = client.guilds.cache.get(id);
    const member = await guild.members.fetch({ user: s.user.id, force: true }).catch(() => null);
    if (!member || !member.permissions.has(PermissionFlagsBits.ManageGuild)) throw fail(403, 'You no longer have permission to manage this server.');
    return guild;
  }
  const server = http.createServer(async (req, res) => {
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cache-Control', 'no-store');
    if (origin.protocol === 'https:') res.setHeader('Strict-Transport-Security', 'max-age=31536000');
    const json = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); };
    const redirect = location => { res.writeHead(302, { Location: location }); res.end(); };
    try {
      const url = new URL(req.url, origin);
      const id = (req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
      let s = sessions.get(id);
      if (s && s.expires <= Date.now()) { sessions.delete(id); s = null; }
      if (req.method === 'GET' && url.pathname === '/auth/login') {
        if (sessions.size >= 10000) throw fail(503, 'Sign-in is busy. Try again shortly.');
        const sid = random(), state = random();
        if (id) sessions.delete(id);
        sessions.set(sid, { state, expires: Date.now() + 300000 });
        res.setHeader('Set-Cookie', cookie(sid, 300));
        const params = new URLSearchParams({ client_id: env.DISCORD_CLIENT_ID, redirect_uri: redirectUri, response_type: 'code', scope: 'identify guilds', state });
        return redirect('https://discord.com/oauth2/authorize?' + params);
      }
      if (req.method === 'GET' && url.pathname === '/auth/callback') {
        if (!s?.state || url.searchParams.get('state') !== s.state || !url.searchParams.get('code')) throw fail(400, 'Sign-in expired or was cancelled. Start again.');
        sessions.delete(id);
        const token = await discord('/oauth2/token', '', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: env.DISCORD_CLIENT_ID, client_secret: env.DISCORD_CLIENT_SECRET, grant_type: 'authorization_code', code: url.searchParams.get('code'), redirect_uri: redirectUri }) });
        const user = await discord('/users/@me', token.access_token);
        const sid = random();
        sessions.set(sid, { user: { id: user.id, name: user.global_name || user.username }, token: token.access_token, csrf: random(), expires: Date.now() + Math.min(3600, token.expires_in) * 1000 });
        res.setHeader('Set-Cookie', cookie(sid));
        return redirect('/');
      }
      if (url.pathname.startsWith('/api/')) {
        if (!s?.token) throw fail(401, 'Sign in with Discord to continue.');
        if (req.method !== 'GET' && (req.headers.origin !== origin.origin || req.headers['x-csrf-token'] !== s.csrf)) throw fail(403, 'Security check failed. Refresh and try again.');
        if (req.method === 'POST' && url.pathname === '/api/logout') {
          sessions.delete(id); res.setHeader('Set-Cookie', cookie('', 0)); return json(200, { ok: true });
        }
        if (req.method === 'GET' && url.pathname === '/api/me') return json(200, { user: s.user, csrf: s.csrf, guilds: (await guilds(s)).map(g => ({ id: g.id, name: g.name })) });
        const match = url.pathname.match(/^\/api\/guilds\/(\d{17,20})$/);
        if (!match || !['GET', 'PUT'].includes(req.method)) throw fail(404, 'Not found.');
        const guild = await authorizedGuild(s, match[1]);
        const channels = await guild.channels.fetch();
        const roles = await guild.roles.fetch();
        if (req.method === 'GET') return json(200, { settings: store.get(guild.id), channels: [...channels.values()].filter(c => c && [0, 5].includes(c.type)).map(c => ({ id: c.id, name: c.name })), roles: [...roles.values()].filter(r => r.id !== guild.id && !r.managed).map(r => ({ id: r.id, name: r.name })) });
        if (!req.headers['content-type']?.startsWith('application/json')) throw fail(415, 'JSON is required.');
        let body = '', size = 0;
        for await (const chunk of req) { size += chunk.length; if (size > 4096) throw fail(413, 'Request too large.'); body += chunk; }
        let input;
        try { input = validate(JSON.parse(body)); } catch { throw fail(400, 'Invalid settings. Refresh and check your values.'); }
        for (const key of ['aiChannelId', 'levelChannelId']) {
          if (!input[key]) continue;
          const channel = channels.get(input[key]);
          if (!channel || ![0, 5].includes(channel.type) || !channel.permissionsFor(guild.members.me)?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages])) throw fail(400, 'Choose a text channel the bot can view and send messages in.');
        }
        if (input.djRoleId && (!roles.has(input.djRoleId) || input.djRoleId === guild.id || roles.get(input.djRoleId).managed)) throw fail(400, 'Choose an available server role.');
        return json(200, { settings: store.update(guild.id, input) });
      }
      const files = { '/': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/style.css': ['style.css', 'text/css'] };
      if (req.method !== 'GET' || !files[url.pathname]) throw fail(404, 'Not found.');
      const [file, type] = files[url.pathname];
      res.writeHead(200, { 'Content-Type': type + '; charset=utf-8' });
      res.end(fs.readFileSync(path.join(__dirname, 'public', file)));
    } catch (error) { json(error.status || 500, { error: error.status ? error.message : 'Unable to complete the request. Please try again.' }); }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.on('close', () => { clearInterval(prune); sessions.clear(); });
  return server;
}
function startDashboard(client) {
  if (process.env.DASHBOARD_ENABLED !== 'true') return;
  const server = createDashboard(client);
  server.listen(Number(process.env.DASHBOARD_PORT || 3000), process.env.DASHBOARD_HOST || '127.0.0.1', () => console.log('Dashboard listening on configured host and port.'));
  server.on('error', error => console.error('Dashboard failed to listen:', error.code));
  return server;
}
module.exports = { createDashboard, startDashboard, canManage };
