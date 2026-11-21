# GrailStitch

Requires Node 20+.

    npm install
    npm run build      # generates dist/
    npm run serve      # preview at http://localhost:3000

## Add an article
Create src/content/articles/my-slug.md:

    ---
    title: Your Title
    description: One or two sentences for Google (about 150 characters).
    date: 2026-12-01
    decade: 80s            # 60s-70s | 80s | 90s-y2k
    category: Outerwear
    imageAlt: Detailed description of the hero image
    image: /images/my-hero.jpg   # optional, put files in src/static/images/
    draft: true                  # optional, hides the article
    ---
    Write in Markdown. Use ## for sections.

    {{product Product title | Short description | ebay search words}}
    {{ad}}

Then build. The article page, homepage cards, decade/guides pages and sitemap update automatically.

## Edit site-wide parts
- Header, footer, head/fonts: src/partials/
- Article layout: src/templates/article.html
- Static pages (About, Privacy...): src/pages/
- eBay campaign ID: top of build.js (CAMPID)

## Deploy
- GitHub Pages: Settings > Pages > Source: GitHub Actions (workflow included).
- Cloudflare Pages: build command `npm run build`, output directory `dist`.
