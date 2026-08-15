export async function onRequestGet(context) {
  const key = context.params.key;
  const object = await context.env.EVENT_IMAGES.get('events/' + key);
  if(!object) return new Response('Not Found',{status:404});
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('Cache-Control','public, max-age=31536000, immutable');
  return new Response(object.body,{headers});
}
