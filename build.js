// GrailStitch static site builder. Run: npm install && npm run build
const fs = require('fs'), path = require('path');
const { marked } = require('marked');

const SITE = 'https://grailstitch.com';
const CAMPID = '5339256798';          // your eBay Partner Network campaign ID
const R = p => path.join(__dirname, p), OUT = R('dist');
const DEC = {
  '60s-70s': ['60s-70s Vintage', 'Guides to vintage clothing and footwear from the sixties and seventies.'],
  '80s': ['80s Vintage', 'Guides to vintage clothing and footwear from the eighties.'],
  '90s-y2k': ['90s-Y2K Vintage', 'Guides to vintage clothing and footwear from the nineties and the early 2000s.'],
};
const PH = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 500'%3E%3Crect width='800' height='500' fill='%23b3a48a'/%3E%3C/svg%3E";
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const RAW = new Set(['content', 'toc', 'cards', 'jsonld']);
const abs = u => !u ? '' : /^https?:/.test(u) ? u : SITE + u;

function render(tpl, vars) {
  tpl = tpl.replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, n) => fs.readFileSync(R(`src/partials/${n}.html`), 'utf8'));
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => k in vars ? (RAW.has(k) ? vars[k] : esc(vars[k])) : m);
}
function parse(raw) {
  const m = raw.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error('Missing front matter');
  const d = {};
  m[1].split('\n').forEach(l => { const i = l.indexOf(':'); if (i > 0) d[l.slice(0, i).trim()] = l.slice(i + 1).trim().replace(/^["']|["']$/g, ''); });
  return { d, body: m[2] };
}
const slugify = t => t.replace(/<[^>]+>/g, '').toLowerCase().replace(/&\w+;/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

let toc = [];
marked.use({ renderer: { heading({ tokens, depth }) {
  const html = this.parser.parseInline(tokens), id = slugify(html);
  if (depth === 2) toc.push([id, html.replace(/<[^>]+>/g, '')]);
  return `<h${depth} id="${id}">${html}</h${depth}>\n`;
} } });

function shortcodes(md) {
  const blocks = []; let n = 0;
  const keep = h => { blocks.push(h); return `\n\n<!--SC${blocks.length - 1}-->\n\n`; };
  md = md.replace(/\{\{ad\}\}/g, () => keep('<!-- AdSense placeholder: replace this div with your Google ad code -->\n<div class="ad my-8" style="width:336px;height:280px" role="img" aria-label="Advertisement placeholder"></div>'));
  md = md.replace(/\{\{product\s+([^}]+)\}\}/g, (_, args) => {
    const [t, desc, q] = args.split('|').map(s => s.trim()); n++;
    const url = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(q)}&amp;mkcid=1&amp;campid=${CAMPID}`;
    return keep(`<aside class="callout surface p-5 my-8" aria-labelledby="pick-${n}">
<p class="muted text-sm !mb-1 !text-sm">Collector’s pick</p>
<h3 id="pick-${n}" class="font-serif text-2xl font-bold">${esc(t)}</h3>
<p class="!text-base !leading-relaxed !mb-4 muted">${esc(desc)}</p>
<a class="btn" href="${url}" rel="nofollow sponsored noopener" target="_blank">Check Current Prices on eBay<span class="sr-only"> (opens in a new tab)</span></a>
</aside>`);
  });
  return { md, blocks };
}

const card = a => `<article class="surface"><a href="${a.path}" class="block"><img loading="lazy" width="800" height="500" class="w-full h-auto" alt="${esc(a.imageAlt)}" src="${a.image || PH}"><div class="p-5"><p class="muted text-sm">${esc(a.label)}</p><h3 class="font-serif text-xl font-bold mt-1">${esc(a.title)}</h3><p class="muted mt-2 text-sm">${esc(a.description)}</p></div></a></article>`;
const cards = list => list.length ? list.map(card).join('\n') : '<p class="muted">Articles coming soon.</p>';
const write = (p, s) => { fs.mkdirSync(path.dirname(path.join(OUT, p)), { recursive: true }); fs.writeFileSync(path.join(OUT, p), s); };

fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync(R('src/static'), OUT, { recursive: true });

// Articles
const dir = R('src/content/articles');
const articles = fs.readdirSync(dir).filter(f => f.endsWith('.md')).map(f => {
  const { d, body } = parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  if (d.draft === 'true') return null;
  const slug = f.replace(/\.md$/, ''), pth = `/articles/${slug}.html`;
  toc = [];
  const sc = shortcodes(body);
  let html = marked.parse(sc.md).replace(/<!--SC(\d+)-->/g, (_, i) => sc.blocks[i]);
  const words = body.split(/\s+/).length, dt = new Date(d.date);
  const a = { ...d, slug, path: pth, url: SITE + pth, image: d.image || PH, ogImage: abs(d.image) || SITE + '/images/og-default.jpg',
    label: `${(DEC[d.decade] || [d.decade])[0]}, ${d.category}`, decadeTitle: (DEC[d.decade] || [d.decade])[0],
    dateText: dt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    readTime: Math.max(1, Math.round(words / 220)), author: d.author || 'GrailStitch Editorial', content: html,
    toc: toc.map(([id, t]) => `<li><a class="underline underline-offset-4 accent" href="#${id}">${esc(t)}</a></li>`).join('') };
  a.jsonld = JSON.stringify({ '@context': 'https://schema.org', '@type': 'Article', headline: d.title, description: d.description,
    image: [a.ogImage], datePublished: dt.toISOString(), dateModified: new Date(d.updated || d.date).toISOString(),
    author: { '@type': 'Person', name: a.author },
    publisher: { '@type': 'Organization', name: 'GrailStitch', url: SITE + '/', logo: { '@type': 'ImageObject', url: SITE + '/images/logo.png' } },
    mainEntityOfPage: { '@type': 'WebPage', '@id': a.url } }, null, 2);
  write(`articles/${slug}.html`, render(fs.readFileSync(R('src/templates/article.html'), 'utf8'), a));
  return a;
}).filter(Boolean).sort((a, b) => new Date(b.date) - new Date(a.date));

// Pages
const urls = [];
for (const f of fs.readdirSync(R('src/pages'))) {
  const home = f === 'index.html';
  write(f, render(fs.readFileSync(R('src/pages/' + f), 'utf8'), { cards: cards(articles.slice(0, 6)) }));
  urls.push([home ? '/' : '/' + f, home ? 1 : 0.3, '2026-11-21']);
}
// Listing pages
const lists = { ...Object.fromEntries(Object.entries(DEC).map(([k, v]) => [k, [v[0], v[1], articles.filter(a => a.decade === k)]])),
  guides: ['Guides', 'Every GrailStitch buying guide, from newest to oldest.', articles] };
for (const [slug, [heading, intro, list]] of Object.entries(lists)) {
  write(`${slug}/index.html`, render(fs.readFileSync(R('src/templates/listing.html'), 'utf8'), { heading, intro, url: `${SITE}/${slug}/`, cards: cards(list) }));
  urls.push([`/${slug}/`, 0.6, new Date().toISOString().slice(0, 10)]);
}
articles.forEach(a => urls.push([a.path, 0.8, new Date(a.updated || a.date).toISOString().slice(0, 10)]));

write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map(([u, p, l]) => `  <url>\n    <loc>${SITE}${u}</loc>\n    <lastmod>${l}</lastmod>\n    <priority>${p}</priority>\n  </url>`).join('\n') + '\n</urlset>\n');
console.log(`Built ${articles.length} article(s), ${urls.length} URLs into dist/`);
