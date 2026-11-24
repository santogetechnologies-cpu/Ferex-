#!/usr/bin/env node
// Reads the real source (routes in App.tsx, the layouts' menus, every screen and the components it renders) and writes
// src/data/workflows/inventory.generated.json: for each app, its roles, screens, buttons, fields, tables and functions.
// Central > App Workflows shows this file, so the diagrams can never drift from the code. Run:  npm run gen:workflows
import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SRC = path.join(ROOT, 'src');
const read = f => fs.readFileSync(f, 'utf8');
const parse = f => ts.createSourceFile(f, read(f), ts.ScriptTarget.Latest, true, f.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
const rel = f => path.relative(ROOT, f).split(path.sep).join('/');
const clean = s => s.replace(/\s+/g, ' ').trim();

// ───────────────────────── App.tsx: role lists, component files, routes ─────────────────────────
const appFile = path.join(SRC, 'App.tsx');
const appSf = parse(appFile);
const roleLists = Object.create(null);
const componentFile = Object.create(null);
const resolveModule = (from, spec) => {
  if (!spec.startsWith('.')) return null;
  const base = path.resolve(path.dirname(from), spec);
  for (const ext of ['.tsx', '.ts', '/index.tsx', '/index.ts']) if (fs.existsSync(base + ext)) return base + ext;
  return null;
};
const strings = node => (ts.isArrayLiteralExpression(node) ? node.elements.filter(ts.isStringLiteralLike).map(e => e.text) : null);

(function scanApp(node) {
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
    const arr = strings(node.initializer);
    if (arr && /ROLES$/.test(node.name.text)) roleLists[node.name.text] = arr;
    // const X = lazy(() => import('./pages/X').then(m => ({ default: m.X })))
    const text = node.initializer.getText(appSf);
    const m = /import\(['"](\.[^'"]+)['"]\)/.exec(text);
    if (m) { const f = resolveModule(appFile, m[1]); const e = /default:\s*m\.(\w+)/.exec(text); if (f) componentFile[node.name.text] = { file: f, exp: e ? e[1] : 'default' }; }
  }
  if (ts.isImportDeclaration(node) && node.importClause && ts.isStringLiteral(node.moduleSpecifier)) {
    const f = resolveModule(appFile, node.moduleSpecifier.text);
    if (f) {
      if (node.importClause.name) componentFile[node.importClause.name.text] = { file: f, exp: 'default' };
      const nb = node.importClause.namedBindings;
      if (nb && ts.isNamedImports(nb)) nb.elements.forEach(e => { componentFile[e.name.text] = { file: f, exp: (e.propertyName || e.name).text }; });
    }
  }
  ts.forEachChild(node, scanApp);
})(appSf);

const jsxName = n => (ts.isJsxElement(n) ? n.openingElement.tagName.getText() : ts.isJsxSelfClosingElement(n) ? n.tagName.getText() : '');
const attrOf = (el, name) => {
  const attrs = ts.isJsxElement(el) ? el.openingElement.attributes : el.attributes;
  for (const a of attrs.properties) if (ts.isJsxAttribute(a) && a.name.getText() === name) return a.initializer;
  return undefined;
};
const attrString = (el, name) => {
  const v = attrOf(el, name);
  if (!v) return undefined;
  if (ts.isStringLiteral(v)) return v.text;
  if (ts.isJsxExpression(v) && v.expression) {
    if (ts.isStringLiteralLike(v.expression)) return v.expression.text;
    if (ts.isTemplateExpression(v.expression)) return v.expression.head.text + v.expression.templateSpans.map(s => '{…}' + s.literal.text).join('');
    return `{${clean(v.expression.getText())}}`;
  }
  return undefined;
};

const routes = [];
(function scanRoutes(node) {
  if (ts.isJsxSelfClosingElement(node) && node.tagName.getText() === 'Route') {
    const p = attrString(node, 'path');
    const el = attrOf(node, 'element');
    if (p && el && ts.isJsxExpression(el) && el.expression) {
      const route = { path: p, roles: null, layout: null, page: null, props: {}, redirect: null };
      (function walk(n) {
        const name = jsxName(n);
        if (name === 'Navigate') route.redirect = attrString(n, 'to') || null;
        else if (name === 'ProtectedRoute') {
          const v = attrOf(n, 'allowedRoles');
          if (v && ts.isJsxExpression(v) && v.expression) {
            const e = v.expression;
            route.roles = ts.isIdentifier(e) ? roleLists[e.text] || [e.text] : ts.isArrayLiteralExpression(e) ? strings(e) : [clean(e.getText())];
          }
        } else if (name && /Layout$/.test(name)) route.layout = name;
        else if (name && /^[A-Z]/.test(name) && !['Suspense', 'Fragment'].includes(name) && !route.page) {
          route.page = name;
          const attrs = ts.isJsxElement(n) ? n.openingElement.attributes : n.attributes;
          for (const a of attrs.properties) if (ts.isJsxAttribute(a)) route.props[a.name.getText()] = clean(a.initializer ? a.initializer.getText().replace(/^[{"']|[}"']$/g, '') : 'true');
        }
        ts.forEachChild(n, walk);
      })(el.expression);
      routes.push(route);
    }
  }
  ts.forEachChild(node, scanRoutes);
})(appSf);

// ───────────────────────── Per-file extraction ─────────────────────────
const UI_SKIP = /(\/components\/(Button|Card|Badge|Kit|CapLoader|Logo|Input|Skeleton|ToastNotification|Modal|Pagination|Table)\.tsx$|\/layouts\/)/;
const fileCache = new Map();

function textOf(node, sf, env) {
  // The visible words of a JSX subtree: text, string literals, template pieces, and (for mapped lists) the list's own strings.
  const out = [];
  (function w(n) {
    if (ts.isJsxAttributes(n) || ts.isJsxAttribute(n)) return; // class names and props are not visible words
    if (ts.isJsxText(n)) { const t = clean(n.text); if (t) out.push(t); return; }
    if (ts.isJsxExpression(n) && n.expression) {
      const e = n.expression;
      if (ts.isStringLiteralLike(e)) { out.push(e.text); return; }
      if (ts.isIdentifier(e) && env[e.text]) { out.push(env[e.text].join(' / ')); return; }
      if (ts.isTemplateExpression(e)) { out.push(clean(e.head.text + e.templateSpans.map(s => '…' + s.literal.text).join(''))); return; }
      if (ts.isConditionalExpression(e)) { [e.whenTrue, e.whenFalse].forEach(b => { if (ts.isStringLiteralLike(b)) out.push(b.text); else if (ts.isJsxElement(b) || ts.isJsxFragment(b)) w(b); else if (ts.isParenthesizedExpression(b)) w(b.expression); }); return; }
      if (ts.isBinaryExpression(e)) { [e.right].forEach(b => { if (ts.isStringLiteralLike(b)) out.push(b.text); else if (ts.isJsxElement(b) || ts.isJsxFragment(b)) w(b); else if (ts.isParenthesizedExpression(b)) w(b.expression); }); return; }
      if (ts.isPropertyAccessExpression(e) || ts.isIdentifier(e)) { out.push(`{${e.getText(sf).split('.').pop()}}`); return; }
      return;
    }
    ts.forEachChild(n, w);
  })(node);
  return clean(out.join(' '));
}

function handlerName(v, sf) {
  if (!v || !ts.isJsxExpression(v) || !v.expression) return undefined;
  const e = v.expression;
  if (ts.isIdentifier(e)) return e.text;
  if (ts.isPropertyAccessExpression(e)) return e.getText(sf);
  if (ts.isArrowFunction(e) || ts.isFunctionExpression(e)) {
    // First named call inside an inline handler, e.g. () => openPayment(fee)
    let found;
    (function w(n) { if (found) return; if (ts.isCallExpression(n)) { const c = n.expression; const nm = ts.isIdentifier(c) ? c.text : ts.isPropertyAccessExpression(c) ? c.name.text : ''; if (nm && !/^set[A-Z]/.test(nm) && !['preventDefault', 'stopPropagation', 'then', 'catch', 'dispatchEvent'].includes(nm)) { found = nm; return; } } ts.forEachChild(n, w); })(e.body);
    if (found) return found;
    const first = ts.isBlock(e.body) ? e.body.statements[0] : e.body;
    const m = first && /^set([A-Z]\w*)\(/.exec(first.getText(sf));
    return m ? `sets ${m[1]}` : 'inline';
  }
  return undefined;
}

function extract(file) {
  if (fileCache.has(file)) return fileCache.get(file);
  const sf = parse(file);
  const info = { file: rel(file), fns: Object.create(null), importMap: Object.create(null), localImports: [], defaultExport: null };
  const bucket = () => ({ headings: [], buttons: [], links: [], fields: [], columns: [], tables: [], rpcs: [], functions: [], uses: new Set() });
  let cur = bucket(); let seen = new Set();
  const add = (list, item, key) => { const k = list + (key ?? JSON.stringify(item)); if (seen.has(k)) return; seen.add(k); cur[list].push(item); };

  // Lists of strings assigned to a name, so `{LIST.map(x => <button>{x}</button>)}` shows each real label.
  const listEnv = Object.create(null), tupleEnv = Object.create(null), objEnv = Object.create(null);
  (function w(n) {
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer) {
      let init = n.initializer; if (ts.isAsExpression(init)) init = init.expression;
      if (ts.isArrayLiteralExpression(init)) {
        const rows = init.elements.filter(ts.isArrayLiteralExpression).map(r => r.elements.map(e => (ts.isStringLiteralLike(e) ? e.text : null)));
        if (rows.length) tupleEnv[n.name.text] = rows;
        const flat = []; init.elements.forEach(el => { if (ts.isStringLiteralLike(el)) flat.push(el.text); else if (ts.isArrayLiteralExpression(el)) { const s = el.elements.find(ts.isStringLiteralLike); if (s) flat.push(s.text); } else if (ts.isObjectLiteralExpression(el)) { const p = el.properties.find(p => ts.isPropertyAssignment(p) && ['label', 'name', 'title', 'text'].includes(p.name.getText()) && ts.isStringLiteralLike(p.initializer)); if (p) flat.push(p.initializer.text); } });
        if (flat.length) listEnv[n.name.text] = flat;
      }
    }
    ts.forEachChild(n, w);
  })(sf);

  const visit = (n, env) => {
    // `<array>.map(param => <jsx/>)`: inside, the parameter stands for each string in the array.
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && n.expression.name.text === 'map') {
      const recv = n.expression.expression; const cb = n.arguments[0];
      let items = null;
      if (ts.isArrayLiteralExpression(recv)) items = recv.elements.filter(ts.isStringLiteralLike).map(e => e.text);
      else if (ts.isIdentifier(recv) && listEnv[recv.text]) items = listEnv[recv.text];
      if (cb && (ts.isArrowFunction(cb) || ts.isFunctionExpression(cb)) && cb.parameters[0]) {
        const param = cb.parameters[0].name;
        if (items && items.length && ts.isIdentifier(param)) { ts.forEachChild(cb, c => visit(c, { ...env, [param.text]: items })); return; }
        let rows = null;
        const arr = ts.isArrayLiteralExpression(recv) ? recv : ts.isParenthesizedExpression(recv) && ts.isAsExpression(recv.expression) && ts.isArrayLiteralExpression(recv.expression.expression) ? recv.expression.expression : null;
        if (arr) rows = arr.elements.filter(ts.isArrayLiteralExpression).map(r => r.elements.map(e => (ts.isStringLiteralLike(e) ? e.text : null)));
        else if (ts.isIdentifier(recv) && tupleEnv[recv.text]) rows = tupleEnv[recv.text];
        if (rows && rows.length && ts.isArrayBindingPattern(param)) {
          const next = { ...env };
          param.elements.forEach((el, i) => { if (ts.isBindingElement(el) && ts.isIdentifier(el.name)) next[el.name.text] = rows.map(r => r[i]).filter(Boolean); });
          ts.forEachChild(cb, c => visit(c, next));
          return;
        }
      }
    }
    const name = jsxName(n);
    if (name) {
      if (/^[A-Z]/.test(name)) cur.uses.add(name.split('.')[0]);
      const el = n;
      const label = () => {
        const aria = attrString(el, 'aria-label') || attrString(el, 'title');
        const body = ts.isJsxElement(n) ? textOf(n, sf, env) : '';
        return clean(body || aria || attrString(el, 'label') || '');
      };
      if (/^(button|Button|IconButton)$/.test(name)) {
        const handler = handlerName(attrOf(el, 'onClick'), sf) || (attrString(el, 'type') === 'submit' ? 'submit form' : undefined);
        const text = label();
        if (text || handler) add('buttons', { text: text || '(icon)', action: handler || '', type: attrString(el, 'type') || '' });
      } else if (/^(a|Link|NavLink)$/.test(name)) {
        const to = attrString(el, 'to') || attrString(el, 'href');
        const text = label();
        if (to && !to.startsWith('{') || text) add('links', { text: text || '(icon)', to: to || '' });
      } else if (/^(input|Input|select|Select|textarea|Textarea|DateRangeFilter|CountrySelect|PhoneInput)$/.test(name)) {
        const type = name.toLowerCase().includes('select') ? 'dropdown' : name.toLowerCase().includes('textarea') ? 'text area' : name === 'DateRangeFilter' ? 'date filter' : (attrString(el, 'type') || 'text');
        const text = attrString(el, 'aria-label') || attrString(el, 'label') || attrString(el, 'placeholder') || attrString(el, 'name') || '';
        const options = [];
        if (type === 'dropdown' && ts.isJsxElement(n)) (function o(c) { if (ts.isJsxElement(c) && c.openingElement.tagName.getText() === 'option') { const t = textOf(c, sf, env); if (t) options.push(t); } ts.forEachChild(c, o); })(n);
        if (type !== 'hidden') add('fields', { label: text || `(${type})`, type: type === 'file' ? 'file upload' : type, options: options.slice(0, 24) });
      } else if (/^(h1|h2|h3|PageHeader)$/.test(name)) {
        const t = name === 'PageHeader' ? attrString(el, 'title') : textOf(n, sf, env);
        if (t) add('headings', t, t);
      } else if (name === 'th') {
        const t = textOf(n, sf, env); if (t) add('columns', t, t);
      }
    }
    if (ts.isCallExpression(n)) {
      const c = n.expression; const a0 = n.arguments[0];
      const nm = ts.isPropertyAccessExpression(c) ? c.name.text : ts.isIdentifier(c) ? c.text : '';
      if (nm) cur.uses.add(nm);
      if (a0 && ts.isStringLiteralLike(a0)) {
        if (nm === 'from') add('tables', a0.text, a0.text);
        else if (nm === 'rpc') add('rpcs', a0.text, a0.text);
        else if (nm === 'invoke') add('functions', a0.text, a0.text);
        else if (nm === 'useRealtimeTable') add('tables', a0.text, a0.text);
        else if (nm === 'getMasters' || nm === 'createMaster') add('tables', 'digital_settings', 'digital_settings');
      }
    }
    ts.forEachChild(n, c => visit(c, env));
  };

  // One bucket per top-level function or component, so a screen only shows what it actually renders.
  const whole = bucket();
  sf.statements.forEach(st => {
    let name = null;
    if (ts.isFunctionDeclaration(st) && st.name) name = st.name.text;
    else if (ts.isFunctionDeclaration(st) && st.modifiers?.some(m => m.kind === ts.SyntaxKind.DefaultKeyword)) name = 'default';
    else if (ts.isVariableStatement(st)) { const d = st.declarationList.declarations[0]; if (d && ts.isIdentifier(d.name)) name = d.name.text; }
    else if (ts.isExportAssignment(st)) { if (ts.isIdentifier(st.expression)) info.defaultExport = st.expression.text; return; }
    if (!name) return;
    cur = bucket(); seen = new Set(); visit(st, {});
    info.fns[name] = cur;
    if (ts.isFunctionDeclaration(st) && st.modifiers?.some(m => m.kind === ts.SyntaxKind.DefaultKeyword) && st.name) info.defaultExport = st.name.text;
  });

  sf.statements.filter(d => ts.isImportDeclaration(d) || (ts.isExportDeclaration(d) && d.moduleSpecifier)).forEach(d => {
    if (!d.moduleSpecifier || !ts.isStringLiteral(d.moduleSpecifier)) return;
    const f = resolveModule(file, d.moduleSpecifier.text);
    if (!f) return;
    const names = [];
    if (ts.isImportDeclaration(d)) {
      if (d.importClause?.name) { names.push('default'); info.importMap[d.importClause.name.text] = { file: f, exp: 'default' }; }
      const nb = d.importClause?.namedBindings;
      if (nb && ts.isNamedImports(nb)) nb.elements.forEach(e => { const orig = (e.propertyName || e.name).text; names.push(orig); info.importMap[e.name.text] = { file: f, exp: orig }; });
    } else if (d.exportClause && ts.isNamedExports(d.exportClause)) d.exportClause.elements.forEach(e => { const orig = (e.propertyName || e.name).text; names.push(orig); info.importMap[e.name.text] = { file: f, exp: orig }; info.fns[e.name.text] ||= (() => { const b = bucket(); b.uses.add(e.name.text); return b; })(); });
    info.localImports.push({ file: f, names });
  });
  info.fnData = functionData(sf);
  fileCache.set(file, info);
  return info;
}

// Per top-level function: the tables, procedures and server functions it touches, and which other names it calls.
function functionData(sf) {
  const out = Object.create(null);
  const collect = node => {
    const d = { tables: new Set(), rpcs: new Set(), functions: new Set(), calls: new Set() };
    (function w(n) {
      if (ts.isCallExpression(n)) {
        const c = n.expression; const a0 = n.arguments[0];
        const nm = ts.isPropertyAccessExpression(c) ? c.name.text : ts.isIdentifier(c) ? c.text : '';
        if (nm) d.calls.add(nm);
        if (a0 && ts.isStringLiteralLike(a0)) {
          if (nm === 'from') d.tables.add(a0.text);
          else if (nm === 'rpc') d.rpcs.add(a0.text);
          else if (nm === 'invoke') d.functions.add(a0.text);
        }
      }
      ts.forEachChild(n, w);
    })(node);
    return d;
  };
  sf.statements.forEach(st => {
    if (ts.isFunctionDeclaration(st) && st.name) out[st.name.text] = collect(st);
    else if (ts.isVariableStatement(st)) st.declarationList.declarations.forEach(dc => { if (ts.isIdentifier(dc.name) && dc.initializer) out[dc.name.text] = collect(dc.initializer); });
  });
  return out;
}

// Everything a screen shows: its entry component plus the components it renders (not generic UI primitives or layouts).
function scope(entryFile, entryName) {
  const buckets = []; const seen = new Set(); const files = new Set();
  const walk = (file, name, depth) => {
    const info = extract(file);
    let fname = name === 'default' ? info.defaultExport || 'default' : name;
    // `export { X as Y } from './x'` re-exports
    const re = info.importMap[fname];
    const key = file + '::' + fname; if (seen.has(key) || depth > 6) return; seen.add(key);
    const fn = info.fns[fname];
    if (!fn) { if (re && re.file !== file) walk(re.file, re.exp, depth + 1); return; }
    buckets.push(fn); files.add(info.file);
    for (const u of fn.uses) {
      if (info.fns[u] && u !== fname) walk(file, u, depth + 1);
      else if (info.importMap[u]) { const imp = info.importMap[u]; const r = rel(imp.file); if (/^src\/(components|pages)\//.test(r) && !UI_SKIP.test(imp.file) && /^[A-Z]/.test(u)) walk(imp.file, imp.exp, depth + 1); }
    }
  };
  walk(entryFile, entryName, 0);
  return { buckets, files: [...files] };
}

// Data a screen reaches: its own calls, plus what the API/hook functions it uses touch.
function dataFor(entryFile, entryName) {
  const tables = new Set(), rpcs = new Set(), functions = new Set(); const seen = new Set();
  const useFn = (modFile, name, depth) => {
    const key = modFile + '::' + name; if (seen.has(key) || depth > 5) return; seen.add(key);
    const info = extract(modFile); const fn = info.fnData[name]; if (!fn) return;
    fn.tables.forEach(t => tables.add(t)); fn.rpcs.forEach(t => rpcs.add(t)); fn.functions.forEach(t => functions.add(t));
    fn.calls.forEach(c => {
      if (info.fnData[c]) useFn(modFile, c, depth + 1);
      const imp = info.importMap[c]; if (imp && /^src\/(lib|hooks)\//.test(rel(imp.file))) useFn(imp.file, imp.exp, depth + 1);
    });
  };
  const { buckets, files } = scope(entryFile, entryName);
  buckets.forEach(b => { b.tables.forEach(t => tables.add(t)); b.rpcs.forEach(t => rpcs.add(t)); b.functions.forEach(t => functions.add(t)); });
  for (const f of files) {
    const info = extract(path.join(ROOT, f));
    for (const [alias, imp] of Object.entries(info.importMap)) {
      if (!/^src\/(lib|hooks)\//.test(rel(imp.file))) continue;
      if (buckets.some(b => b.uses.has(alias))) useFn(imp.file, imp.exp, 0);
    }
  }
  return { tables: [...tables].sort(), rpcs: [...rpcs].sort(), functions: [...functions].sort() };
}

// ───────────────────────── Layout menus ─────────────────────────
function layoutMenu(layoutName) {
  const c = componentFile[layoutName]; if (!c) return [];
  const sf = parse(c.file); const items = []; const seen = new Set();
  (function w(n) {
    if (ts.isObjectLiteralExpression(n)) {
      const props = Object.fromEntries(n.properties.filter(ts.isPropertyAssignment).map(p => [p.name.getText(), p.initializer]));
      const nm = props.name || props.label; const pth = props.path || props.to || props.href;
      if (nm && pth && ts.isStringLiteralLike(nm) && ts.isStringLiteralLike(pth) && pth.text.startsWith('/')) {
        const key = nm.text + '|' + pth.text;
        if (!seen.has(key)) { seen.add(key); items.push({ name: nm.text, path: pth.text }); }
      }
    }
    ts.forEachChild(n, w);
  })(sf);
  // Menu section titles, in order, from the layout source: `title: 'Management'`
  return items;
}

// ───────────────────────── Build the inventory ─────────────────────────
const APPS = {
  education: { name: 'Ferex Education', prefixes: ['/admin', '/student', '/staff', '/study-abroad'], layouts: ['AdminLayout', 'StudentLayout', 'StaffLayout'] },
  rimi: { name: 'Rimi Frozen Foods', prefixes: ['/rimi'], layouts: ['RimiLayout'] },
  trade: { name: 'Ferex Trade', prefixes: ['/trade'], layouts: ['TradeLayout'] },
  digital: { name: 'Ferex Digital', prefixes: ['/digital'], layouts: ['DigitalLayout', 'DigitalPMLayout'] },
};
const appOf = p => Object.entries(APPS).find(([, a]) => a.prefixes.some(x => p === x || p.startsWith(x + '/')))?.[0] || null;

const pretty = p => p.split('/').filter(Boolean).pop().replace(/[-_:]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
// A readable name: the menu entry if there is one, else the first plain heading, else the path.
const pageTitle = (route, sources, menu) => menu || sources.flatMap(s => s.headings).find(h => !/[{$]/.test(h) && h.length < 48) || pretty(route.path);
// Shared helpers (AI assistant, notifications, global search) reach into other apps' tables; a screen lists only data that belongs to its own app.
const SHARED_TABLES = /^(users|system_config|notifications|tasks|email_configurations|email_logs|activity_log|avatars|crm_masters|attendance_.*)$/;
const ownTable = (appKey, t) => {
  if (SHARED_TABLES.test(t)) return true;
  const prefix = t.startsWith('rimi_') ? 'rimi' : t.startsWith('trade_') ? 'trade' : t.startsWith('digital_') ? 'digital' : 'education';
  return prefix === appKey;
};
const inventory = { generated_by: 'scripts/gen-app-workflows.mjs', apps: {} };

for (const [key, app] of Object.entries(APPS)) {
  const appRoutes = routes.filter(r => appOf(r.path) === key);
  const pages = []; const redirects = []; const rolesSeen = new Map();
  for (const r of appRoutes) {
    if (r.redirect && !r.page) { redirects.push({ from: r.path, to: r.redirect }); continue; }
    if (!r.page) continue;
    const entry = componentFile[r.page]; if (!entry) continue;
    const file = entry.file;
    const roles = r.roles || [];
    roles.forEach(x => rolesSeen.set(x, (rolesSeen.get(x) || 0) + 1));
    const { buckets, files } = scope(file, entry.exp); const data = dataFor(file, entry.exp);
    const sources = buckets;
    const page = {
      path: r.path, title: '', component: r.page, file: rel(file), layout: r.layout, roles,
      props: r.props,
      headings: [...new Set(sources.flatMap(s => s.headings))],
      buttons: dedupe(sources.flatMap(s => s.buttons), b => b.text + '|' + b.action),
      links: dedupe(sources.flatMap(s => s.links), l => l.text + '|' + l.to),
      fields: dedupe(sources.flatMap(s => s.fields), f => f.label + '|' + f.type),
      columns: [...new Set(sources.flatMap(s => s.columns))],
      tables: data.tables.filter(t => ownTable(key, t)), rpcs: data.rpcs.filter(r => key === 'education' ? !/^(rimi_|digital_|trade_)/.test(r) : r.startsWith(key + '_') || /^(attendance_|ensure_|get_)/.test(r)), functions: data.functions,
      sources: files,
    };
    pages.push(page);
  }
  // Menus
  const menus = app.layouts.map(l => ({ layout: l, items: layoutMenu(l) }));
  // Which menu entry (and section order) each screen belongs to
  const navIndex = new Map();
  menus.forEach(m => m.items.forEach((it, i) => { if (!navIndex.has(it.path)) navIndex.set(it.path, { layout: m.layout, name: it.name, order: i }); }));
  pages.forEach(p => { const n = navIndex.get(p.path) || navIndex.get(p.path.replace(/\/:[^/]+$/, '')); if (n) { p.menu = n.name; p.menuOrder = n.order; } p.title = pageTitle({ path: p.path, page: p.component }, p.headings.map(h => ({ headings: [h] })), p.menu); });
  inventory.apps[key] = {
    name: app.name,
    roles: [...rolesSeen.entries()].map(([role, screens]) => ({ role, screens })).sort((a, b) => b.screens - a.screens),
    layouts: app.layouts,
    menus,
    pages,
    redirects,
    totals: {
      screens: pages.length,
      buttons: pages.reduce((s, p) => s + p.buttons.length, 0),
      fields: pages.reduce((s, p) => s + p.fields.length, 0),
      links: pages.reduce((s, p) => s + p.links.length, 0),
      tables: [...new Set(pages.flatMap(p => p.tables))].length,
    },
  };
}
function dedupe(list, keyFn) { const m = new Map(); list.forEach(x => { const k = keyFn(x); if (!m.has(k)) m.set(k, x); }); return [...m.values()]; }

const outFile = process.env.WORKFLOWS_OUT || path.join(SRC, 'data', 'workflows', 'inventory.generated.json');
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(inventory));
for (const [k, a] of Object.entries(inventory.apps)) console.log(`${k.padEnd(10)} ${String(a.totals.screens).padStart(3)} screens  ${String(a.totals.buttons).padStart(4)} buttons  ${String(a.totals.fields).padStart(4)} fields  ${a.roles.length} roles  ${a.totals.tables} tables`);
