/**
 * Sitemap Generator Edge Function
 *
 * Generates sitemap.xml from published CMS content and static public pages.
 * Returns XML with proper Content-Type header.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const FRONTEND_URL = Deno.env.get('FRONTEND_URL') ?? 'http://localhost:8080';

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Fetch all published CMS content
  const { data: content } = await supabase
    .from('cms_content')
    .select('slug, updated_at, content_type')
    .eq('status', 'published')
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order('updated_at', { ascending: false });

  // Static public pages
  const staticPages = [
    { loc: '/', changefreq: 'daily', priority: '1.0' },
    { loc: '/home', changefreq: 'daily', priority: '1.0' },
    { loc: '/auth', changefreq: 'monthly', priority: '0.5' },

    // Products
    { loc: '/checking', changefreq: 'monthly', priority: '0.8' },
    { loc: '/savings', changefreq: 'monthly', priority: '0.8' },
    { loc: '/credit-cards', changefreq: 'monthly', priority: '0.8' },
    { loc: '/auto-loans', changefreq: 'monthly', priority: '0.8' },
    { loc: '/mortgages', changefreq: 'monthly', priority: '0.8' },
    { loc: '/loans', changefreq: 'monthly', priority: '0.8' },
    { loc: '/rates', changefreq: 'weekly', priority: '0.9' },

    // Resources
    { loc: '/learn', changefreq: 'weekly', priority: '0.7' },
    { loc: '/calculators', changefreq: 'monthly', priority: '0.7' },
    { loc: '/fraud-prevention', changefreq: 'monthly', priority: '0.6' },
    { loc: '/faqs', changefreq: 'monthly', priority: '0.7' },

    // Credit Union
    { loc: '/about', changefreq: 'monthly', priority: '0.7' },
    { loc: '/community', changefreq: 'monthly', priority: '0.6' },
    { loc: '/careers', changefreq: 'weekly', priority: '0.7' },
    { loc: '/scholarships', changefreq: 'monthly', priority: '0.6' },
    { loc: '/contact', changefreq: 'monthly', priority: '0.6' },
    { loc: '/find-us', changefreq: 'monthly', priority: '0.7' },

    // Account actions
    { loc: '/open-account', changefreq: 'monthly', priority: '0.8' },
    { loc: '/activate', changefreq: 'monthly', priority: '0.5' },
  ];

  const today = new Date().toISOString().split('T')[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

  // Add static pages
  for (const page of staticPages) {
    xml += `  <url>
    <loc>${FRONTEND_URL}${page.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
  }

  // Add CMS content pages
  for (const item of content ?? []) {
    const lastmod = (item.updated_at as string).split('T')[0];
    xml += `  <url>
    <loc>${FRONTEND_URL}/p/${item.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
`;
  }

  xml += `</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600',
    },
  });
});
