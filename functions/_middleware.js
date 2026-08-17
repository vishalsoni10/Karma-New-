export async function onRequest(context) {
  const response = await context.next();
  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('text/html')) return response;

  const html = await response.text();
  const seo = `
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
<meta name="author" content="Karma Event Management">
<meta name="geo.region" content="IN-GJ">
<meta name="geo.placename" content="Palitana, Gujarat, India">
<link rel="canonical" href="https://karmaevent.in/">
<meta property="og:type" content="website">
<meta property="og:url" content="https://karmaevent.in/">
<meta property="og:title" content="Karma Event Management | Jain Event Management in Palitana & Ahmedabad">
<meta property="og:description" content="Karma Event Management for Jain events, religious events, weddings and premium event experiences in Palitana, Ahmedabad and Gujarat.">
<meta property="og:site_name" content="Karma Event Management">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Karma Event Management | Palitana & Ahmedabad">
<meta name="twitter:description" content="Jain event management, religious event planning and premium event services in Palitana, Ahmedabad and Gujarat.">
<script type="application/ld+json">${JSON.stringify({
  "@context":"https://schema.org",
  "@type":"ProfessionalService",
  "name":"Karma Event Management",
  "url":"https://karmaevent.in/",
  "description":"Jain event management, religious event planning, weddings and premium event management services in Palitana, Ahmedabad and Gujarat.",
  "serviceType":["Jain Event Management","Religious Event Management","Event Management","Wedding Event Management","Corporate Event Management"],
  "areaServed":[
    {"@type":"City","name":"Palitana"},
    {"@type":"City","name":"Ahmedabad"},
    {"@type":"State","name":"Gujarat"}
  ],
  "sameAs":["https://www.instagram.com/karma_events_management/"]
})}</script>`;

  if (/<head[\s>]/i.test(html)) {
    return new Response(html.replace(/<head([^>]*)>/i, '<head$1>' + seo), {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
  }

  return new Response(html, { status: response.status, statusText: response.statusText, headers: response.headers });
}
