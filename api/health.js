export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  return new Response(JSON.stringify({ status: 'ok', edge: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
