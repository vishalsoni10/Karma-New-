export async function onRequest(context) {
  const url = new URL(context.request.url);
  const response = await context.next();
  const contentType = response.headers.get('content-type') || '';

  // Keep SEO enhancements limited to public HTML. Never expose SEO/schema metadata
  // on the private admin panel or API responses.
  if (url.pathname.startsWith('/admin') || url.pathname.startsWith('/api/') || !contentType.includes('text/html')) {
    return response;
  }

  const html = await response.text();

  const seoTitle = 'Karma Event Management | Jain Event Management in Palitana & Ahmedabad';
  const seoDescription = 'Karma Event Management provides Jain event management, religious event planning, weddings, hospitality and premium event services in Palitana, Ahmedabad and across Gujarat.';

  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': 'https://karmaevent.in/#organization',
        'name': 'Karma Event Management',
        'url': 'https://karmaevent.in/',
        'sameAs': ['https://www.instagram.com/karma_events_management/']
      },
      {
        '@type': 'ProfessionalService',
        '@id': 'https://karmaevent.in/#business',
        'name': 'Karma Event Management',
        'url': 'https://karmaevent.in/',
        'description': seoDescription,
        'parentOrganization': { '@id': 'https://karmaevent.in/#organization' },
        'serviceType': [
          'Jain Event Management',
          'Jain Religious Event Management',
          'Religious Event Management',
          'Event Planning',
          'Wedding Event Management',
          'Corporate Event Management',
          'Event Hospitality Management'
        ],
        'areaServed': [
          { '@type': 'City', 'name': 'Palitana', 'containedInPlace': { '@type': 'State', 'name': 'Gujarat' } },
          { '@type': 'City', 'name': 'Ahmedabad', 'containedInPlace': { '@type': 'State', 'name': 'Gujarat' } },
          { '@type': 'City', 'name': 'Bhavnagar', 'containedInPlace': { '@type': 'State', 'name': 'Gujarat' } },
          { '@type': 'State', 'name': 'Gujarat' }
        ],
        'knowsAbout': [
          'Jain events',
          'Jain religious events',
          'Pratishtha events',
          'religious event planning',
          'event hospitality',
          'wedding events',
          'corporate events'
        ]
      },
      {
        '@type': 'WebSite',
        '@id': 'https://karmaevent.in/#website',
        'url': 'https://karmaevent.in/',
        'name': 'Karma Event Management',
        'publisher': { '@id': 'https://karmaevent.in/#organization' },
        'inLanguage': 'en-IN'
      }
    ]
  };

  const seo = `
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
<meta name="googlebot" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
<meta name="bingbot" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
<meta name="author" content="Karma Event Management">
<meta name="language" content="en-IN">
<meta name="geo.region" content="IN-GJ">
<meta name="geo.placename" content="Palitana, Gujarat, India">
<link rel="canonical" href="https://karmaevent.in/">
<link rel="alternate" hreflang="en-IN" href="https://karmaevent.in/">
<link rel="alternate" hreflang="x-default" href="https://karmaevent.in/">
<meta property="og:type" content="website">
<meta property="og:url" content="https://karmaevent.in/">
<meta property="og:title" content="${seoTitle}">
<meta property="og:description" content="${seoDescription}">
<meta property="og:site_name" content="Karma Event Management">
<meta property="og:locale" content="en_IN">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${seoTitle}">
<meta name="twitter:description" content="${seoDescription}">
<script type="application/ld+json">${JSON.stringify(graph)}</script>`;

  // Replace only document metadata. No visible HTML/CSS/layout is changed.
  let optimized = html
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${seoTitle}</title>`)
    .replace(/<meta\s+name=["']description["'][^>]*>/i, `<meta name="description" content="${seoDescription}">`);

  if (/<head[\s>]/i.test(optimized)) {
    optimized = optimized.replace(/<head([^>]*)>/i, '<head$1>' + seo);
  }

  return new Response(optimized, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  });
}
