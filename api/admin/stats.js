import { getDashboardStats, sql } from '../lib/analytics.js';

export default async function handler(req, res) {
  // Simple auth check - password in query param (not production-grade but fine for internal tool)
  const authToken = req.headers['authorization'] || req.query.token;
  const expectedToken = process.env.ADMIN_TOKEN;
  
  if (!expectedToken) {
    return res.status(500).json({ error: 'Admin token not configured' });
  }
  
  if (authToken !== expectedToken && authToken !== `Bearer ${expectedToken}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const hours = parseInt(req.query.hours) || 24;
    const stats = await getDashboardStats(hours);
    
    res.json({
      success: true,
      hours,
      generatedAt: new Date().toISOString(),
      stats
    });
  } catch (error) {
    console.error('Admin API error:', error);
    res.status(500).json({ error: 'Failed to fetch stats', message: error.message });
  }
}
