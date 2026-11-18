#!/usr/bin/env node
// Renders positions and awards from data/positions.json into index.html and the flyers.
// Usage (from the site folder): node tools/build-positions.js
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'data', 'positions.json'), 'utf8'));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function between(html, name, body, file) {
  const re = new RegExp(`(<!-- ${name}:START[^>]*-->)[\\s\\S]*?(\\s*<!-- ${name}:END -->)`);
  if (!re.test(html)) throw new Error(`${file}: markers ${name}:START/END not found`);
  return html.replace(re, (_, a, b) => a + body + b);
}

// ---- Site -----------------------------------------------------------------
function sitePositions() {
  const tabs = data.groups.map((g, i) =>
    `      <button class="tab" role="tab" id="t${i + 1}" aria-controls="${g.id}" aria-selected="${i === 0}"${i ? ' tabindex="-1"' : ''}>${esc(g.tab)}<span class="c">${g.roles.length}</span></button>`);
  const panels = data.groups.map((g, i) => {
    const roles = g.roles.map(r =>
      `      <div class="role${r.hl ? ' hl' : ''}"><span class="pip"></span><div><b>${esc(r.role)}</b><span>${esc(r.org)}</span>${r.when ? `<em class="when">${esc(r.when)}</em>` : ''}</div></div>`);
    return `    <div class="panel" role="tabpanel" id="${g.id}" aria-labelledby="t${i + 1}"${i ? ' hidden' : ''}>\n${roles.join('\n')}\n    </div>`;
  });
  return `\n    <div class="tabs" role="tablist" aria-label="Positions by level">\n${tabs.join('\n')}\n    </div>\n\n${panels.join('\n')}`;
}

function siteAwards() {
  return '\n' + data.awards.map(a =>
    `        <div class="award reveal"><div class="yr">${esc(a.year)}</div><p>${esc(a.name)}<small>${esc(a.by)}</small></p></div>`).join('\n');
}

function heroAwards() {
  const counts = new Map();
  data.awards.forEach(a => counts.set(a.hero, (counts.get(a.hero) || 0) + 1));
  const parts = [...counts].map(([k, n]) => esc(k) + (n > 1 ? ` ×${n}` : ''));
  const medal = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="8" r="6"/><path d="M15.5 13.5L17 22l-5-3-5 3 1.5-8.5"/></svg>';
  return `<a class="awline" href="#awards">${medal}<span><b>${data.awards.length} IEEE volunteer awards</b> · ${parts.join(' · ')} →</span></a>`;
}

const idx = path.join(root, 'index.html');
let html = fs.readFileSync(idx, 'utf8');
html = between(html, 'POSITIONS', sitePositions() + '\n', 'index.html');
html = between(html, 'AWARDS', siteAwards(), 'index.html');
html = between(html, 'HEROAWARDS', heroAwards(), 'index.html');
// Awards count in the Record stats
html = html.replace(/(id="stat-awards" data-count=")\d+(">)\d+(<)/, `$1${data.awards.length}$2${data.awards.length}$3`);
// JSON-LD award list
const ld = JSON.stringify(data.awards.map(a => `${a.schema || a.name} (${a.year})`));
if (!/"award":\[[^\]]*\]/.test(html)) throw new Error('index.html: JSON-LD "award" not found');
html = html.replace(/"award":\[[^\]]*\]/, `"award":${ld}`);
fs.writeFileSync(idx, html);
console.log('index.html updated');

// ---- Flyers ---------------------------------------------------------------
const short = w => w.replace(/\s*–\s*present/, '–')
  .replace(/(\d{4})\s*–\s*(\d{4})/g, (_, a, b) => a.slice(0, 2) === b.slice(0, 2) ? `${a}–${b.slice(2)}` : `${a}–${b}`)
  .replace(/\s*·\s*/g, ', ');
const hasYear = s => /\b(19|20)\d{2}\b/.test(s);

function flyerRecord() {
  const lines = new Map();
  data.groups.flatMap(g => g.roles).filter(r => r.flyer).forEach(r => {
    if (!lines.has(r.flyer)) lines.set(r.flyer, []);
    lines.get(r.flyer).push(r);
  });
  const muted = t => ` <span style="color:var(--muted)">(${esc(t)})</span>`;
  const out = [...lines.keys()].sort((a, b) => a - b).map(n => {
    const rs = lines.get(n), opt = (data.flyerLines || {})[n] || {};
    const role = opt.role || rs[0].role;
    if (rs.length === 1) {
      const r = rs[0];
      return `        <li><b>${esc(role)}</b>, ${esc(r.short || r.org)}${r.when && !hasYear(r.short || '') ? muted(short(r.when)) : ''}${esc(opt.suffix || '')}</li>`;
    }
    const items = rs.map(r => esc(r.short || r.org) + (r.when && !hasYear(r.short || '') ? muted(short(r.when)) : ''));
    return `        <li><b>${esc(role)}</b>, ${items.join(' · ')}${esc(opt.suffix || '')}</li>`;
  });
  return '\n' + out.join('\n');
}

function flyerAwards() {
  return '\n' + data.awards.map(a => `        <div><b>${esc(a.year)}</b>${esc(a.flyer || a.name)}</div>`).join('\n');
}

for (const f of ['flyer.html', 'flyer-status.html']) {
  const p = path.join(root, '..', 'poster', f);
  if (!fs.existsSync(p)) { console.log(`skip ${f} (not found)`); continue; }
  let h = fs.readFileSync(p, 'utf8');
  h = between(h, 'RECORD', flyerRecord(), f);
  h = between(h, 'AWARDS', flyerAwards(), f);
  fs.writeFileSync(p, h);
  console.log(`${f} updated`);
}
