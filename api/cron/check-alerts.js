import { checkAndAlert } from '../lib/alerts.js';

// This endpoint is meant to be called by Vercel Cron or external scheduler
// It checks for anomalies and sends alerts if needed
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Simple auth check - require secret for cron
  const authHeader = req.headers.authorization;
  const expectedToken = process.env.CRON_SECRET;
  
  if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const result = await checkAndAlert();
    res.json({ 
      success: true, 
      checked: result.checked,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Alert check failed:', error);
    res.status(500).json({ error: 'Alert check failed' });
  }
}
