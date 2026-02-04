// Simple admin endpoint - testing deployment
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Simple health check response
  res.json({ 
    status: 'ok', 
    message: 'Admin endpoint is live',
    timestamp: new Date().toISOString()
  });
}
