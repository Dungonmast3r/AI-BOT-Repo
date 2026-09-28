const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { SettingsStore, validate } = require('../utils/guildSettings');
const { createDashboard, canManage } = require('../dashboard/server');
const guildId = '123456789012345678';
test('settings persist, isolate guilds and reject unsafe fields', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dungeon-settings-'));
  try {
    const file = path.join(dir, 'settings.json'); const store = new SettingsStore(file);
    store.update(guildId, { aiEnabled: false, djRoleId: '234567890123456789' });
    assert.equal(new SettingsStore(file).get(guildId).aiEnabled, false);
    assert.equal(store.get('345678901234567890').aiEnabled, true);
    assert.throws(() => validate({ aiEnabled: 'false' }));
    assert.throws(() => validate({ token: 'secret' }));
    assert.throws(() => validate({ aiChannelId: '../bad' }));
    assert.throws(() => store.update('__proto__', {}));
    fs.writeFileSync(file, '{broken'); assert.throws(() => new SettingsStore(file));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
test('only owner, admin or Manage Server can manage', () => {
  assert.ok(canManage({ permissions: '8' })); assert.ok(canManage({ permissions: '32' }));
  assert.ok(canManage({ owner: true })); assert.equal(canManage({ permissions: '16' }), false);
});
test('OAuth, session rotation, CSRF, fresh authorization and resource validation', async t => {
  let permission = true, calls = 0, written;
  const guild = { id: guildId, members: { me: {}, fetch: async () => ({ permissions: { has: () => permission } }) },
    channels: { fetch: async () => new Map() }, roles: { fetch: async () => new Map() } };
  const server = createDashboard({ guilds: { cache: new Map([[guildId, guild]]) } }, {
    env: { DISCORD_CLIENT_ID: 'test', DISCORD_CLIENT_SECRET: 'test', DASHBOARD_URL: 'http://localhost:3000' },
    store: { get: () => ({ aiEnabled: true }), update: (id, input) => { written = { id, input }; return input; } },
    fetch: async url => { calls++; return { ok: true, json: async () => url.endsWith('/oauth2/token') ? { access_token: 'private-token', expires_in: 3600 } : url.endsWith('/users/@me') ? { id: 'user', username: 'Tester' } : [{ id: guildId, name: '<script>unsafe</script>', permissions: '32' }] }; },
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const get = (route, init) => fetch(base + route, { redirect: 'manual', ...init });
  assert.equal((await get('/api/me')).status, 401);
  assert.equal((await get('/api/guilds/' + guildId, { method: 'PUT' })).status, 401);
  const page = await get('/'); assert.equal(page.status, 200); assert.match(page.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  const login = await get('/auth/login'); const before = login.headers.get('set-cookie').split(';')[0];
  const state = new URL(login.headers.get('location')).searchParams.get('state');
  assert.equal((await get('/auth/callback?code=x&state=wrong', { headers: { Cookie: before } })).status, 400);
  assert.equal(calls, 0);
  const callback = await get(`/auth/callback?code=x&state=${state}`, { headers: { Cookie: before } });
  assert.equal(callback.status, 302); const cookie = callback.headers.get('set-cookie').split(';')[0]; assert.notEqual(cookie, before);
  assert.equal((await get('/api/me', { headers: { Cookie: before } })).status, 401);
  const me = await (await get('/api/me', { headers: { Cookie: cookie } })).json(); assert.equal(me.token, undefined);
  const headers = { Cookie: cookie, Origin: 'http://localhost:3000', 'Content-Type': 'application/json', 'X-CSRF-Token': me.csrf };
  const put = (body, extra = {}) => get('/api/guilds/' + guildId, { method: 'PUT', headers: { ...headers, ...extra }, body: JSON.stringify(body) });
  assert.equal((await put({ aiEnabled: false }, { Origin: 'https://evil.example' })).status, 403);
  assert.equal((await put({ aiEnabled: false }, { 'X-CSRF-Token': 'bad' })).status, 403);
  assert.equal((await put({ aiChannelId: '999999999999999999' })).status, 400);
  assert.equal((await put({ djRoleId: '999999999999999999' })).status, 400);
  assert.equal((await put({ unknown: true })).status, 400);
  assert.equal((await put({ aiEnabled: false })).status, 200); assert.deepEqual(written, { id: guildId, input: { aiEnabled: false } });
  permission = false; assert.equal((await put({ aiEnabled: true })).status, 403);
  assert.equal((await get('/api/guilds/999999999999999999', { headers })).status, 403);
  assert.equal((await get('/api/logout', { method: 'POST', headers })).status, 200);
  assert.equal((await get('/api/me', { headers })).status, 401);
});
