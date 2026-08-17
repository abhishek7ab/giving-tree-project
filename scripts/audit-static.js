/**
 * Static audit: finds interactive elements whose handlers/targets do not exist.
 * Usage: node scripts/audit-static.js
 */
const fs = require('fs');
const path = require('path');

const FRONTEND = path.join(__dirname, '..', 'frontend');
const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['assets', '.git', 'node_modules'].includes(e.name) && dir === FRONTEND) {
        // still walk assets/js for shared scripts
        if (e.name === 'assets') walk(p);
        continue;
      }
      walk(p);
    } else if (e.name.endsWith('.html')) files.push(p);
  }
})(FRONTEND);

// Collect global JS available to every page (shared asset scripts)
const sharedJsFiles = [];
const jsDir = path.join(FRONTEND, 'assets', 'js');
if (fs.existsSync(jsDir)) {
  for (const f of fs.readdirSync(jsDir)) if (f.endsWith('.js')) sharedJsFiles.push(path.join(jsDir, f));
}
const sharedJs = sharedJsFiles.map(f => fs.readFileSync(f, 'utf8')).join('\n');

// Routes registered on the server
const routeSrc = ['routes/authRoutes.js', 'routes/itemRoutes.js', 'routes/requestRoutes.js', 'server.js']
  .map(f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8')).join('\n');
const registeredRoutes = [];
for (const m of routeSrc.matchAll(/(?:router|app)\.(get|post|put|patch|delete)\(\s*['"`]([^'"`]+)['"`]/g)) {
  registeredRoutes.push({ method: m[1].toUpperCase(), route: m[2] });
}

function definedNames(src) {
  const names = new Set();
  for (const m of src.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(/g)) names.add(m[1]);
  for (const m of src.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function|\()/g)) names.add(m[1]);
  for (const m of src.matchAll(/window\.([A-Za-z_$][\w$]*)\s*=/g)) names.add(m[1]);
  for (const m of src.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/g)) names.add(m[1]);
  for (const m of src.matchAll(/class\s+([A-Za-z_$][\w$]*)/g)) names.add(m[1]);
  return names;
}

const BROWSER_GLOBALS = new Set(['alert', 'confirm', 'prompt', 'console', 'window', 'document', 'location', 'history',
  'fetch', 'setTimeout', 'setInterval', 'JSON', 'Object', 'Array', 'Math', 'Date', 'String', 'Number', 'Boolean',
  'event', 'this', 'localStorage', 'sessionStorage', 'navigator', 'open', 'scrollTo', 'print', 'form', 'io', 'L',
  'maplibregl', 'Promise', 'Map', 'Set', 'URLSearchParams', 'FormData', 'Intl', 'encodeURIComponent', 'parseInt', 'parseFloat']);

const report = {};

for (const file of files) {
  const rel = path.relative(FRONTEND, file).replace(/\\/g, '/');
  const src = fs.readFileSync(file, 'utf8');
  const findings = [];

  // ---- scripts referenced by the page
  let pageJs = src;
  for (const m of src.matchAll(/<script[^>]+src=["']([^"']+)["']/g)) {
    const s = m[1];
    if (s.startsWith('http')) continue;
    const p = path.join(FRONTEND, s.replace(/^\//, ''));
    if (fs.existsSync(p)) pageJs += '\n' + fs.readFileSync(p, 'utf8');
    else findings.push({ type: 'MISSING_SCRIPT', detail: s });
  }
  const defined = definedNames(pageJs + '\n' + sharedJs);

  // ---- inline handlers -> undefined functions
  for (const m of src.matchAll(/\son(click|change|submit|input|keyup|keydown|keypress|focus|blur|load|error|mouseenter|mouseleave)\s*=\s*"([^"]*)"/gi)) {
    const evt = m[1], code = m[2];
    for (const call of code.matchAll(/([A-Za-z_$][\w$.]*)\s*\(/g)) {
      const name = call[1];
      if (name.includes('.')) continue; // method call on object
      if (BROWSER_GLOBALS.has(name)) continue;
      if (!defined.has(name)) {
        const idx = m.index;
        const line = src.slice(0, idx).split('\n').length;
        findings.push({ type: 'UNDEFINED_HANDLER', detail: `on${evt}="${code.slice(0, 70)}" -> ${name}() not defined`, line });
      }
    }
  }

  // ---- getElementById targets that don't exist in markup
  const idsInMarkup = new Set([...src.matchAll(/\sid=["']([^"']+)["']/g)].map(m => m[1]));
  const dynamicIds = new Set([...pageJs.matchAll(/id=["'\\]*\$\{[^}]+\}/g)].map(() => 1));
  for (const m of pageJs.matchAll(/getElementById\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    const id = m[1];
    if (!idsInMarkup.has(id) && !pageJs.includes(`id="${id}"`) && !pageJs.includes(`id='${id}'`)) {
      findings.push({ type: 'MISSING_ELEMENT_ID', detail: `getElementById('${id}') — no element with that id` });
    }
  }

  // ---- local hrefs that point nowhere
  for (const m of src.matchAll(/<a\b[^>]*href=["']([^"']*)["'][^>]*>/gi)) {
    const href = m[1];
    const tag = m[0];
    const line = src.slice(0, m.index).split('\n').length;
    if (href === '#' || href === '' || href === 'javascript:void(0)' || href === 'javascript:;') {
      if (!/onclick|data-|role=|\sid=/i.test(tag)) {
        findings.push({ type: 'DEAD_LINK', detail: `${tag.slice(0, 110)}`, line });
      }
      continue;
    }
    if (/^(https?:|mailto:|tel:|#|javascript:|data:)/i.test(href)) continue;
    const clean = href.split('?')[0].split('#')[0];
    const candidates = [path.join(FRONTEND, clean.replace(/^\//, '')), path.join(path.dirname(file), clean)];
    const isRoute = registeredRoutes.some(r => r.method === 'GET' && (r.route === clean || r.route === '/' + clean));
    if (!candidates.some(c => fs.existsSync(c)) && !isRoute) {
      findings.push({ type: 'BROKEN_HREF', detail: `href="${href}"`, line });
    }
  }

  // ---- fetch() calls to endpoints that are not registered
  for (const m of pageJs.matchAll(/fetch\(\s*[`'"]([^`'"]+)[`'"]/g)) {
    let url = m[1];
    if (url.startsWith('http')) continue;
    const clean = url.split('?')[0].replace(/\$\{[^}]*\}/g, ':param').replace(/\/$/, '');
    const match = registeredRoutes.some(r => {
      const rp = r.route.replace(/:[^/]+/g, ':param');
      return rp === clean || rp === clean.replace(/\/:param$/, '') ||
        rp.replace(/:param/g, 'X') === clean.replace(/:param/g, 'X');
    });
    if (!match && clean.startsWith('/')) {
      findings.push({ type: 'UNKNOWN_ENDPOINT', detail: `fetch('${url}')` });
    }
  }

  // ---- buttons with no handler at all (no onclick, no id/class referenced in JS, not submit)
  for (const m of src.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)) {
    const attrs = m[1];
    const text = m[2].replace(/<[^>]*>/g, '').trim().slice(0, 40);
    const line = src.slice(0, m.index).split('\n').length;
    if (/onclick|type=["']submit["']|data-/i.test(attrs)) continue;
    const idm = attrs.match(/\sid=["']([^"']+)["']/);
    const classm = attrs.match(/class=["']([^"']+)["']/);
    let wired = false;
    if (idm) {
      const id = idm[1];
      if (new RegExp(`['"\`#]${id}['"\`]|getElementById\\(['"]${id}['"]\\)|#${id}`).test(pageJs + sharedJs)) wired = true;
    }
    if (!wired && classm) {
      for (const c of classm[1].split(/\s+/)) {
        if (new RegExp(`querySelector(All)?\\([^)]*\\.${c}|classList[^\\n]*${c}|['"]\\.${c}['"]`).test(pageJs + sharedJs)) { wired = true; break; }
      }
    }
    // closest form => submit button by default
    if (!wired) findings.push({ type: 'UNWIRED_BUTTON', detail: `<button${attrs.slice(0, 80)}> "${text}"`, line });
  }

  if (findings.length) report[rel] = findings;
}

// output
let total = 0;
for (const [file, findings] of Object.entries(report)) {
  console.log(`\n########## ${file} (${findings.length}) ##########`);
  const byType = {};
  for (const f of findings) (byType[f.type] ||= []).push(f);
  for (const [t, list] of Object.entries(byType)) {
    console.log(`\n-- ${t} (${list.length})`);
    for (const f of list) console.log(`   ${f.line ? 'L' + f.line + ': ' : ''}${f.detail}`);
  }
  total += findings.length;
}
console.log(`\n\nTOTAL FINDINGS: ${total}`);
