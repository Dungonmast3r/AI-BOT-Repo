# Dungeon server dashboard

The dashboard runs in the bot process and applies settings immediately, per Discord server. It needs Node.js 22 or newer (Node 24 recommended). Install dependencies with `npm ci`, then run `npm start`. Run checks with `npm test`.

## Setup

1. Copy `dotenv.example` to `.env` and configure the existing bot/API credentials.
2. In the [Discord Developer Portal](https://discord.com/developers/applications), select the bot application. Under OAuth2, copy its client ID and client secret into `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET` in `.env`. Never put these in frontend files.
3. Add the exact redirect URL `http://localhost:3000/auth/callback` under OAuth2 redirects. Set `DASHBOARD_ENABLED=true`, `DASHBOARD_URL=http://localhost:3000`, `DASHBOARD_HOST=127.0.0.1`, and `DASHBOARD_PORT=3000`.
4. Start the bot, open http://localhost:3000 and choose **Continue with Discord**. The login requests only `identify` and `guilds`. The bot must be installed in a server where you have Administrator or Manage Server permission.
5. For a remote server, use an SSH tunnel for local access, or place the listener behind an HTTPS reverse proxy. For public access, set `DASHBOARD_URL=https://your-domain.example` and register `https://your-domain.example/auth/callback` in Discord. Keep the listener on loopback when the proxy is on the same host. The public URL is explicit; forwarded headers are not trusted. Configure proxy request limits/rate limiting. No hosting service is deployed by this change.

Discord's [OAuth2 documentation](https://discord.com/developers/docs/topics/oauth2) describes the authorization-code flow used here. Dashboard startup rejects public HTTP URLs or missing OAuth credentials. Leave `DASHBOARD_ENABLED=false` to run only the bot.

## Settings and behavior

- **AI** controls AI slash commands and channel chat. The selected channel receives replies, optionally only when the bot is mentioned. Channel chat requires the Message Content intent enabled in the Developer Portal and `GROQ_API_KEY`. An empty channel disables channel chat; AI commands still work. Conversation history is separated by server/user. A 10-second per-user cooldown limits channel chat.
- **Music** controls music commands, radio selection and music buttons. An empty DJ role permits everyone; otherwise the role or Manage Server/Administrator is required. Turning music off blocks further controls but leaves an existing queue playing: stop it first if desired.
- **Leveling** controls text and voice XP plus level/leaderboard commands. **Voice activity XP** can be disabled separately. Existing XP is preserved. Text level-ups use the selected channel or the source channel; voice level-ups use the selected channel or DM.
- Settings inherit existing `config.js` defaults until overridden. Stale channel IDs are shown as unavailable; select a valid destination or clear them before saving. Temporary voice room configuration stays in `config.js`.

Settings live in `data/guild-settings.json`, with atomic replacement on save. Back up this private file with runtime data. Run one bot/dashboard process per data directory; this store does not support multiple writers. A corrupt file fails startup instead of silently discarding settings. Sessions and OAuth tokens stay in memory and expire within an hour; restarting signs everyone out. There is no persistent session secret to configure because the cookie is a cryptographically random opaque session ID. Public HTTPS uses Secure, HttpOnly, SameSite cookies. Login has one-use, five-minute state; writes require a session CSRF token and matching Origin. Every settings read/write rechecks Discord membership and permissions and validates channel/role membership. The client never receives OAuth tokens or secrets.

## Verification

`npm test` covers persistence, server isolation, invalid settings, OAuth state/session rotation, unauthenticated access, CSRF/origin rejection, revoked permissions, foreign server/channel/role access, and logout using mocked Discord responses. A live login needs your own OAuth credentials and registered redirect. After setup, sign in, change a channel or feature, reload to check persistence, and exercise AI/music/XP in a test server. Also verify a member without Manage Server cannot see or edit the server.

If the downloaded `node_modules` contains a native SQLite binary for a different platform, install dependencies on the machine that runs the bot with `npm ci`. Do not reuse bundled native binaries between Windows and Linux. This source download's existing SQLite binary could not load on the Windows validation host; the dashboard/policy tests passed without using that binary. Full bot login and Discord playback/XP smoke tests require a compatible install and live credentials.
