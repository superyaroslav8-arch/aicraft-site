/* Ai крафт */
const App = {
  K: { users: 'aic_users', session: 'aic_session', settings: 'aic_settings', links: 'aic_links' },
  getUsers() { try { return JSON.parse(localStorage.getItem(this.K.users) || '{}'); } catch { return {}; } },
  saveUsers(u) { localStorage.setItem(this.K.users, JSON.stringify(u)); },
  getSession() { try { return JSON.parse(localStorage.getItem(this.K.session) || 'null'); } catch { return null; } },
  setSession(s) { localStorage.setItem(this.K.session, JSON.stringify(s)); },
  clearSession() { localStorage.removeItem(this.K.session); },
  enter({ name, photo }) {
    name = (name || 'Гость').trim().slice(0, 32) || 'Гость';
    let key = 'u_' + name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/gi, '');
    if (key === 'u_') key = 'u_' + Date.now();
    const users = this.getUsers();
    if (!users[key]) users[key] = { name, photo: photo || null, sites: [] };
    else { users[key].name = name; if (photo) users[key].photo = photo; }
    this.saveUsers(users);
    this.setSession({ login: key, name });
    return this.getSession();
  },
  require() {
    const s = this.getSession();
    if (!s) { location.href = 'enter.html'; return null; }
    return s;
  },
  settings() {
    try { return Object.assign({ theme: 'dark', accent: '#8b5cf6', lang: 'ru' }, JSON.parse(localStorage.getItem(this.K.settings) || '{}')); }
    catch { return { theme: 'dark', accent: '#8b5cf6', lang: 'ru' }; }
  },
  saveSettings(p) {
    const n = Object.assign(this.settings(), p);
    localStorage.setItem(this.K.settings, JSON.stringify(n));
    this.applyTheme(n);
    return n;
  },
  applyTheme(s) {
    s = s || this.settings();
    document.documentElement.setAttribute('data-theme', s.theme || 'dark');
    document.documentElement.style.setProperty('--accent', s.accent || '#8b5cf6');
  },
  sites(login) { return (this.getUsers()[login] || {}).sites || []; },
  saveSites(login, list) {
    const u = this.getUsers();
    if (!u[login]) u[login] = { sites: [], name: login };
    u[login].sites = list;
    this.saveUsers(u);
  },
  createSite(login, data) {
    const list = this.sites(login);
    const site = {
      id: 's_' + Date.now(),
      name: data.name || 'Сайт',
      subdomain: data.subdomain,
      domain: data.domain || 'ai_craft.ru',
      customDomain: data.customDomain || '',
      description: data.description || '',
      createdAt: new Date().toISOString(),
      files: data.files || {}
    };
    list.unshift(site);
    this.saveSites(login, list);
    return site;
  },
  deleteSite(login, id) {
    this.saveSites(login, this.sites(login).filter(s => s.id !== id));
  },
  getLinks(login) {
    try { return (JSON.parse(localStorage.getItem(this.K.links) || '{}')[login]) || []; } catch { return []; }
  },
  saveLinks(login, list) {
    const all = JSON.parse(localStorage.getItem(this.K.links) || '{}');
    all[login] = list;
    localStorage.setItem(this.K.links, JSON.stringify(all));
  },
  createLink(login, { title, url, slug }) {
    const list = this.getLinks(login);
    const short = (slug || Math.random().toString(36).slice(2, 8)).toLowerCase().replace(/[^a-z0-9-]/g, '');
    const item = { id: 'l_' + Date.now(), title: title || short, url, slug: short, shortUrl: 'aicraft.link/' + short };
    list.unshift(item);
    this.saveLinks(login, list);
    return item;
  },
  deleteLink(login, id) { this.saveLinks(login, this.getLinks(login).filter(l => l.id !== id)); },
  esc(t) { const d = document.createElement('div'); d.textContent = t || ''; return d.innerHTML; },
  toast(msg) {
    let el = document.querySelector('.toast');
    if (!el) { el = document.createElement('div'); el.className = 'toast'; document.body.appendChild(el); }
    el.textContent = msg; el.classList.add('show');
    clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('show'), 2000);
  },
  imageUrl(prompt) {
    const q = encodeURIComponent(String(prompt).slice(0, 300));
    const seed = Math.floor(Math.random() * 1e9);
    return 'https://image.pollinations.ai/prompt/' + q + '?width=768&height=512&seed=' + seed + '&nologo=true&model=flux';
  },
  parse(desc) {
    const d = (desc || '').toLowerCase();
    const sections = [{ id: 'hero', title: 'Главная' }];
    const add = (id, title) => { if (!sections.find(s => s.id === id)) sections.push({ id, title }); };
    if (/о нас|about|компани|истор/i.test(d)) add('about', 'О нас');
    if (/услуг|service/i.test(d)) add('services', 'Услуги');
    if (/меню|кофе|еда|напит/i.test(d)) add('menu', 'Меню');
    if (/цен|тариф|price/i.test(d)) add('pricing', 'Цены');
    add('contact', 'Контакты');
    let tone = 'neutral';
    if (/тёпл|уют|пауза/i.test(d)) tone = 'warm';
    if (/яркий|энерг/i.test(d)) tone = 'bold';
    if (/дело|бизнес|строг/i.test(d)) tone = 'business';
    const title = ((desc || '').match(/^([^.\n!?]{3,40})/) || [, 'Мой сайт'])[1].trim();
    return { title, sections, tone, description: desc || '' };
  },
  html(desc, name) {
    const p = this.parse(desc);
    const t = this.esc(name || p.title);
    const text = this.esc(p.description.slice(0, 400));
    const nav = p.sections.filter(s => s.id !== 'hero').map(s => '<a href="#' + s.id + '">' + s.title + '</a>').join('');
    const body = p.sections.filter(s => s.id !== 'hero').map(s => {
      if (s.id === 'menu') return '<section id="menu" class="sec"><div class="w"><h2>Меню</h2><div class="g"><div class="i"><h3>Фирменный</h3><p>По описанию</p></div><div class="i"><h3>Классика</h3><p>База</p></div></div></div></section>';
      if (s.id === 'services') return '<section id="services" class="sec alt"><div class="w"><h2>Услуги</h2><p>' + text.slice(0, 150) + '</p></div></section>';
      if (s.id === 'contact') return '<section id="contact" class="sec alt"><div class="w"><h2>Контакты</h2><p>Напишите нам</p></div></section>';
      return '<section id="' + s.id + '" class="sec"><div class="w"><h2>' + s.title + '</h2><p>' + text + '</p></div></section>';
    }).join('');
    return '<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + t + '</title><link rel="stylesheet" href="style.css"></head><body><header class="h"><div class="w"><strong>' + t + '</strong><nav>' + nav + '</nav></div></header><section class="hero"><div class="w"><h1>' + t + '</h1><p>' + text + '</p><a class="b" href="#contact">Связаться</a></div></section>' + body + '<footer class="f"><div class="w">© ' + new Date().getFullYear() + ' ' + t + '</div></footer></body></html>';
  },
  css(tone) {
    const a = { warm: '#c4a484', bold: '#ef4444', business: '#1e3a5f', neutral: '#8b5cf6' }[tone] || '#8b5cf6';
    return '*{box-sizing:border-box;margin:0;padding:0}body{font-family:system-ui,sans-serif;line-height:1.6;color:#111;background:#fafafa}.w{max-width:900px;margin:0 auto;padding:0 20px}.h{background:#fff;border-bottom:1px solid #eee;position:sticky;top:0}.h .w{display:flex;justify-content:space-between;align-items:center;height:60px}nav a{margin-left:14px;color:#555;text-decoration:none;font-size:14px}.hero{padding:64px 0;text-align:center;background:linear-gradient(#fff,#f5f0ff)}.hero h1{font-size:clamp(26px,5vw,40px);margin-bottom:12px}.hero p{color:#555;max-width:520px;margin:0 auto 20px}.b{display:inline-block;padding:12px 20px;background:' + a + ';color:#fff;border-radius:999px;text-decoration:none;font-weight:600}.sec{padding:48px 0}.sec.alt{background:#fff}.g{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-top:16px}.i{padding:14px;border:1px solid #eee;border-radius:12px;background:#fff}.f{padding:20px 0;border-top:1px solid #eee;font-size:13px;color:#888}';
  },
  openSite(site) {
    if (!site || !site.files || !site.files['index.html']) { this.toast('Нет содержимого'); return; }
    let doc = site.files['index.html'];
    const css = site.files['style.css'] || '';
    if (doc.includes('</head>')) doc = doc.replace('</head>', '<style>' + css + '</style></head>');
    else doc = '<style>' + css + '</style>' + doc;
    const w = window.open('', '_blank');
    if (!w) { this.toast('Разрешите всплывающие окна'); return; }
    w.document.open(); w.document.write(doc); w.document.close();
  },
  addr(s) {
    if (s.customDomain) return s.customDomain;
    return (s.subdomain || 'site') + '.' + (s.domain || 'ai_craft.ru');
  },
  nav(active) {
    const items = [
      ['home.html', 'Мои сайты'],
      ['build.html', 'Собрать сайт'],
      ['neuro.html', 'Нейро'],
      ['media.html', 'Медиа'],
      ['links.html', 'Ссылки'],
      ['settings.html', 'Настройки']
    ];
    return items.map(([h, t]) => '<a href="' + h + '" class="' + (active === h ? 'on' : '') + '">' + t + '</a>').join('');
  },
  mob(active) {
    return '<nav class="mob">' +
      '<a href="home.html" class="' + (active === 'home.html' ? 'on' : '') + '">Сайты</a>' +
      '<a href="build.html" class="' + (active === 'build.html' ? 'on' : '') + '">Собрать</a>' +
      '<a href="neuro.html" class="' + (active === 'neuro.html' ? 'on' : '') + '">Нейро</a>' +
      '<a href="settings.html" class="' + (active === 'settings.html' ? 'on' : '') + '">Ещё</a></nav>';
  }
};
document.addEventListener('DOMContentLoaded', () => App.applyTheme());
