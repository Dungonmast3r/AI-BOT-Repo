const $ = selector => document.querySelector(selector);
let csrf, saved, currentGuild, loading = false;
const form = $('#settings'), status = $('#status');
async function api(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf || '', ...options.headers } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}
function values() { return Object.fromEntries(Object.keys(saved).map(key => [key, form.elements[key].type === 'checkbox' ? form.elements[key].checked : form.elements[key].value])); }
function dirty() { return saved && JSON.stringify(values()) !== JSON.stringify(saved); }
function update() { const changed = dirty(); $('#save').disabled = loading || !changed; $('#reset').disabled = loading || !changed; $('#save-state').textContent = changed ? 'You have unsaved changes' : 'All changes saved'; }
function fill() { for (const [key, value] of Object.entries(saved)) { const el = form.elements[key]; if (el.type === 'checkbox') el.checked = value; else el.value = value; } update(); }
function options(select, entries, empty, selected) {
  select.replaceChildren(new Option(empty, ''));
  for (const entry of entries) select.add(new Option(entry.name, entry.id));
  if (selected && !entries.some(e => e.id === selected)) select.add(new Option('Unavailable selection — choose another', selected));
}
async function loadGuild(id) {
  loading = true; form.hidden = true; $('#guild').disabled = true; status.textContent = 'Loading server settings…';
  try {
    const data = await api('/api/guilds/' + id);
    currentGuild = id; saved = data.settings;
    options(form.elements.aiChannelId, data.channels, 'No channel chat', saved.aiChannelId);
    options(form.elements.levelChannelId, data.channels, 'Default announcement destination', saved.levelChannelId);
    options(form.elements.djRoleId, data.roles, 'Everyone can control music', saved.djRoleId);
    $('#server-name').textContent = $('#guild').selectedOptions[0].textContent;
    fill(); form.hidden = false; status.textContent = '';
  } catch (error) { status.textContent = error.message; }
  finally { loading = false; $('#guild').disabled = false; update(); }
}
$('#guild').addEventListener('change', async event => {
  if (dirty() && !confirm('Discard unsaved changes and switch servers?')) { event.target.value = currentGuild; return; }
  await loadGuild(event.target.value);
});
form.addEventListener('input', update);
$('#reset').addEventListener('click', () => { fill(); status.textContent = ''; });
form.addEventListener('submit', async event => {
  event.preventDefault(); if (loading || !dirty()) return;
  loading = true; update(); $('#guild').disabled = true;
  const submitted = values();
  for (const el of form.elements) el.disabled = true;
  try { const data = await api('/api/guilds/' + currentGuild, { method: 'PUT', body: JSON.stringify(submitted) }); saved = data.settings; status.textContent = 'Settings saved. Your server is up to date.'; }
  catch (error) { status.textContent = error.message; }
  finally { loading = false; for (const el of form.elements) el.disabled = false; $('#guild').disabled = false; update(); }
});
window.addEventListener('beforeunload', event => { if (dirty()) { event.preventDefault(); event.returnValue = ''; } });
(async () => {
  try {
    const data = await api('/api/me'); csrf = data.csrf;
    $('#account').append(document.createTextNode(data.user.name));
    const logout = document.createElement('button'); logout.textContent = 'Sign out'; logout.className = 'secondary';
    logout.onclick = async () => { try { await api('/api/logout', { method: 'POST' }); saved = null; location.reload(); } catch (error) { status.textContent = error.message; } };
    $('#account').append(logout); $('#welcome').hidden = true;
    $('#guild').replaceChildren(...data.guilds.map(g => new Option(g.name, g.id)));
    if (data.guilds.length) await loadGuild(data.guilds[0].id);
    else status.textContent = 'No manageable servers found. Dungeon must be installed, and you need Administrator or Manage Server permission. Refresh after updating access.';
  } catch (error) { if (error.message !== 'Sign in with Discord to continue.') status.textContent = error.message; }
})();
