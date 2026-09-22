const SUPABASE_URL = 'https://ggmfsnyhkrdoytbpvtxd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_FqdImZ_XB_PWzK3euU7O8g_gz8sLePg';
const SITE_NAME = '家系ラーメンmap';
const SITE_ORIGIN = 'https://iekei-map.com';
const SITE_IMAGE = `${SITE_ORIGIN}/icons/icon-1024.png`;

function escapeAttribute(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function replaceMeta(html, attribute, key, value) {
  const escaped = escapeAttribute(value);
  const pattern = new RegExp(`<meta\\s+${attribute}="${key}"\\s+content="[^"]*"\\s*\/?>`, 'i');
  const replacement = `<meta ${attribute}="${key}" content="${escaped}">`;
  return pattern.test(html) ? html.replace(pattern, replacement) : html.replace('</head>', `  ${replacement}\n</head>`);
}

function applyMetadata(html, metadata) {
  let output = html;
  if (!/<base\s/i.test(output)) {
    output = output.replace(/<head>/i, '<head>\n  <base href="/">');
  }
  output = output.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeAttribute(metadata.title)}</title>`);
  output = replaceMeta(output, 'name', 'description', metadata.description);
  output = replaceMeta(output, 'property', 'og:title', metadata.title);
  output = replaceMeta(output, 'property', 'og:description', metadata.description);
  output = replaceMeta(output, 'property', 'og:url', metadata.url);
  output = replaceMeta(output, 'property', 'og:image', SITE_IMAGE);
  output = replaceMeta(output, 'name', 'twitter:title', metadata.title);
  output = replaceMeta(output, 'name', 'twitter:description', metadata.description);
  output = replaceMeta(output, 'name', 'twitter:image', SITE_IMAGE);
  if (metadata.noindex) output = replaceMeta(output, 'name', 'robots', 'noindex, nofollow');
  output = output.replace(
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
    `<link rel="canonical" href="${escapeAttribute(metadata.url)}">`
  );
  return output;
}

// Render into the same visible elements that the app fills after its data loads.
// This also leaves useful shop information available without JavaScript.
function renderShopBody(html, shop) {
  if (!shop) return html;
  let output = html.replace('<body>', '<body class="shop-public-page-open" data-shop-prerender>');
  output = output.replace('id="public-shop-page" aria-hidden="true"', 'id="public-shop-page" aria-hidden="false"');
  for (const [id, value] of Object.entries({
    'psp-name': shop.name,
    'psp-reading': shop.nameHiragana,
    'psp-eyebrow': shop.category,
    'psp-description': shop.description
  })) {
    const pattern = new RegExp(`(<(?:h1|div|p) id="${id}"[^>]*>)[^<]*(</(?:h1|div|p)>)`);
    output = output.replace(pattern, (_, start, end) => `${start}${escapeAttribute(value)}${end}`);
  }
  output = output.replace(/(<div id="psp-area"[^\n]*?<span>)[^<]*(<\/span>)/,
    (_, start, end) => `${start}${escapeAttribute(shop.area)}${end}`);
  const style = `<style id="shop-prerender-style">
    body[data-shop-prerender] #loading-screen,
    body[data-shop-prerender] #psp-gallery,
    body[data-shop-prerender] #public-shop-page button,
    body[data-shop-prerender] .psp-side,
    body[data-shop-prerender] .psp-main > :not(#psp-about-section) { display:none !important; }
    body[data-shop-prerender] .psp-grid { display:block; }
    ${!shop.description ? 'body[data-shop-prerender] #psp-about-section { display:none; }' : ''}
    ${!shop.area ? 'body[data-shop-prerender] #psp-area { display:none; }' : ''}
  </style>`;
  return output.replace('</head>', `${style}\n</head>`);
}

function seoApiUrl(env, mode, id = '') {
  if (!env.SEO_SHOPS_API_URL) throw new Error('SEO_SHOPS_API_URL is not configured');
  const url = new URL(env.SEO_SHOPS_API_URL);
  url.searchParams.set('mode', mode);
  if (id) url.searchParams.set('id', id);
  return url;
}

async function fetchSeoPayload(env, mode, id = '') {
  const response = await fetch(seoApiUrl(env, mode, id), {
    cf: { cacheEverything: true, cacheTtl: 300 }
  });
  if (!response.ok) throw new Error(`SEO API: ${response.status}`);
  return response.json();
}

async function selectPublicRows(table, params) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`
    }
  });
  if (!response.ok) throw new Error(`Supabase ${table}: ${response.status}`);
  return response.json();
}

async function profileName(userId) {
  if (!userId) return '';
  const rows = await selectPublicRows('profiles', {
    select: 'display_name',
    id: `eq.${userId}`,
    limit: '1'
  });
  return String(rows?.[0]?.display_name || '').replace(/\s+/g, ' ').trim().slice(0, 50);
}

async function metadataForRoute(type, id, requestUrl, env) {
  const url = `${SITE_ORIGIN}${new URL(requestUrl).pathname}`;
  if (type === 'users') {
    const name = await profileName(id);
    return name
      ? {
          title: `${name}さんのプロフィール｜${SITE_NAME}`,
          description: `${name}さんの家系ラーメン訪問記録を見てみよう。`,
          url
        }
      : {
          title: `ユーザープロフィール｜${SITE_NAME}`,
          description: '公開された家系ラーメンの訪問記録を見てみよう。',
          url
        };
  }

  if (type === 'posts') {
    const rows = await selectPublicRows('visits', {
      select: 'user_id',
      id: `eq.${id}`,
      is_public: 'eq.true',
      limit: '1'
    });
    const name = await profileName(rows?.[0]?.user_id || '');
    return name
      ? {
          title: `${name}さんの投稿｜${SITE_NAME}`,
          description: `${name}さんが公開した家系ラーメンの訪問記録です。`,
          url
        }
      : {
          title: `家系ラーメンの投稿｜${SITE_NAME}`,
          description: '公開された家系ラーメンの訪問記録です。',
          url
        };
  }

  const payload = await fetchSeoPayload(env, 'seo_shop', id);
  const shop = payload?.ok ? payload.shop : null;
  if (!shop?.name) {
    return {
      title: `店舗情報｜${SITE_NAME}`,
      description: '家系ラーメン店の詳細情報、訪問記録、みんなの投稿を確認できます。',
      url,
      noindex: true
    };
  }

  const name = String(shop.name).replace(/\s+/g, ' ').trim().slice(0, 80);
  const area = String(shop.area || '').replace(/\s+/g, ' ').trim().slice(0, 80);
  const category = String(shop.category || '').replace(/\s+/g, ' ').trim().slice(0, 80);
  const description = String(shop.description || '').replace(/\s+/g, ' ').trim().slice(0, 300);
  const summary = `${area ? `${area}の` : ''}「${name}」の店舗情報。${description ? `${description.replace(/[。.!！?？]+$/, '')}。` : ''}営業時間・アクセス・系譜・みんなの訪問記録を確認できます。`;
  return {
    title: `${shop.closed ? '閉店｜' : ''}${name}${area ? `｜${area}の家系ラーメン店` : ''}｜${SITE_NAME}`,
    description: summary,
    shop: { name, area, category, description, nameHiragana: String(shop.nameHiragana || '') },
    url,
    noindex: Boolean(shop.closed)
  };
}

function xmlEscape(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function shopSitemapXml(payload) {
  const lastmod = String(payload?.updatedAt || '').slice(0, 10);
  const urls = (payload?.shops || [])
    .filter(shop => shop?.id)
    .map(shop => {
      const loc = `${SITE_ORIGIN}/shops/${encodeURIComponent(String(shop.id))}`;
      return `  <url>\n    <loc>${xmlEscape(loc)}</loc>${lastmod ? `\n    <lastmod>${xmlEscape(lastmod)}</lastmod>` : ''}\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  if (url.pathname === '/sitemap-shops.xml') {
    try {
      const payload = await fetchSeoPayload(context.env, 'seo_sitemap');
      return new Response(shopSitemapXml(payload), {
        headers: {
          'content-type': 'application/xml; charset=utf-8',
          'cache-control': 'public, max-age=3600'
        }
      });
    } catch (error) {
      console.error('店舗サイトマップの取得エラー:', error);
      return new Response('Sitemap temporarily unavailable', { status: 503 });
    }
  }
  const parts = url.pathname.split('/').filter(Boolean);
  const [type, encodedId] = parts;
  if (parts.length !== 2 || !['users', 'posts', 'shops'].includes(type) || !encodedId) {
    return context.next();
  }

  let id;
  try {
    id = decodeURIComponent(encodedId);
  } catch (_) {
    return new Response('Not Found', { status: 404 });
  }
  if (!id || id.length > 160) return new Response('Not Found', { status: 404 });

  const rootUrl = new URL('/', context.request.url);
  const assetResponse = await context.env.ASSETS.fetch(rootUrl);
  if (!assetResponse.ok) return assetResponse;

  let metadata;
  try {
    metadata = await metadataForRoute(type, id, context.request.url, context.env);
  } catch (error) {
    console.error('リンクカード情報の取得エラー:', error);
    // 店舗の公開可否を取得できない一時障害では noindex を返さない。
    // Google には再取得を促し、正常な公開店舗が誤って除外されるのを防ぐ。
    if (type === 'shops') {
      return new Response('Shop metadata temporarily unavailable', {
        status: 503,
        headers: { 'cache-control': 'no-store' }
      });
    }
    metadata = {
      title: `家系ラーメンmap`,
      description: '家系ラーメンの店舗情報と訪問記録を確認できます。',
      url: `${SITE_ORIGIN}${url.pathname}`,
      noindex: false
    };
  }

  const html = renderShopBody(applyMetadata(await assetResponse.text(), metadata), metadata.shop);
  const headers = new Headers(assetResponse.headers);
  headers.set('content-type', 'text/html; charset=utf-8');
  headers.set('cache-control', `public, max-age=${type === 'shops' ? 3600 : 300}`);
  return new Response(html, { status: 200, headers });
}
