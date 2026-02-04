import { getDashboardStats } from './lib/analytics.js';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Auth check
  const token = req.headers.authorization?.replace('Bearer ', '') || req.query?.token;
  
  if (!ADMIN_PASSWORD) {
    return res.status(503).json({ error: 'ADMIN_PASSWORD not configured' });
  }
  
  if (token !== ADMIN_PASSWORD) {
    if (req.method === 'GET' && !req.query?.token) {
      return res.send(loginPage());
    }
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const stats = await getDashboardStats();
    
    if (req.method === 'POST' || req.query?.format === 'json') {
      return res.json(stats);
    }
    
    res.setHeader('Content-Type', 'text/html');
    res.send(dashboardPage(stats));
  } catch (err) {
    console.error('Admin error:', err);
    res.status(500).json({ error: 'Failed to load stats', details: err.message });
  }
}

function loginPage() {
  return `<!DOCTYPE html>
<html><head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CoproChat Admin</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .box { background: #1e293b; border-radius: 12px; padding: 2rem; border: 1px solid #334155; width: 100%; max-width: 360px; }
    h1 { font-size: 1.5rem; margin-bottom: 1.5rem; text-align: center; }
    input { width: 100%; padding: 0.75rem; border: 1px solid #334155; border-radius: 8px; background: #0f172a; color: #e2e8f0; font-size: 1rem; margin-bottom: 1rem; }
    input:focus { outline: none; border-color: #f59e0b; }
    button { width: 100%; padding: 0.75rem; background: #f59e0b; color: #0f172a; border: none; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; }
    button:hover { background: #d97706; }
  </style>
</head><body>
  <div class="box">
    <h1>💩 CoproChat Admin</h1>
    <form onsubmit="event.preventDefault(); location.href='/api/admin?token='+encodeURIComponent(document.getElementById('t').value)">
      <input type="password" id="t" placeholder="Admin token" autofocus />
      <button type="submit">Login</button>
    </form>
  </div>
</body></html>`;
}

function dashboardPage(s) {
  const fmt = n => (n || 0).toLocaleString();
  return `<!DOCTYPE html>
<html><head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CoproChat Analytics</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #0f172a; color: #e2e8f0; padding: 2rem; line-height: 1.6; }
    .container { max-width: 1000px; margin: 0 auto; }
    h1 { font-size: 2rem; margin-bottom: 0.5rem; background: linear-gradient(90deg, #f59e0b, #eab308); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .sub { color: #64748b; margin-bottom: 2rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .card { background: #1e293b; border-radius: 12px; padding: 1.25rem; border: 1px solid #334155; }
    .card h3 { font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem; }
    .card .val { font-size: 1.75rem; font-weight: 700; }
    .card.warn .val { color: #f59e0b; }
    .card.bad .val { color: #ef4444; }
    .section { background: #1e293b; border-radius: 12px; padding: 1.25rem; margin-bottom: 1rem; border: 1px solid #334155; }
    .section h2 { font-size: 1rem; margin-bottom: 1rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
    th, td { text-align: left; padding: 0.5rem; border-bottom: 1px solid #334155; }
    th { color: #94a3b8; font-weight: 500; }
    tr:last-child td { border-bottom: none; }
    .ts { color: #64748b; font-size: 0.875rem; margin-top: 2rem; }
    .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    @media (max-width: 640px) { .cols { grid-template-columns: 1fr; } body { padding: 1rem; } }
    .refresh { position: fixed; bottom: 2rem; right: 2rem; background: #f59e0b; color: #0f172a; border: none; padding: 0.75rem 1.25rem; border-radius: 50px; font-weight: 600; cursor: pointer; }
  </style>
</head><body>
  <div class="container">
    <h1>💩 CoproChat Analytics</h1>
    <p class="sub">Last 24 hours</p>
    
    <div class="grid">
      <div class="card"><h3>Total Requests</h3><div class="val">${fmt(s.totalRequests)}</div></div>
      <div class="card"><h3>Unique Visitors</h3><div class="val">${fmt(s.uniqueIps)}</div></div>
      <div class="card ${s.injectionAttempts > 0 ? 'bad' : ''}"><h3>Injection Attempts</h3><div class="val">${fmt(s.injectionAttempts)}</div></div>
      <div class="card ${s.errors > 0 ? 'warn' : ''}"><h3>Errors</h3><div class="val">${fmt(s.errors)}</div></div>
      <div class="card"><h3>Avg Response</h3><div class="val">${fmt(s.avgResponseTime)}ms</div></div>
    </div>

    <div class="cols">
      <div class="section">
        <h2>🌍 Top Countries</h2>
        <table>
          <tr><th>Country</th><th>Requests</th></tr>
          ${(s.topCountries || []).map(c => `<tr><td>${c.country}</td><td>${c.count}</td></tr>`).join('') || '<tr><td colspan="2">No data yet</td></tr>'}
        </table>
      </div>
      <div class="section">
        <h2>🏙️ Top Cities</h2>
        <table>
          <tr><th>City</th><th>Country</th><th>#</th></tr>
          ${(s.topCities || []).map(c => `<tr><td>${c.city}</td><td>${c.country}</td><td>${c.count}</td></tr>`).join('') || '<tr><td colspan="3">No data yet</td></tr>'}
        </table>
      </div>
    </div>

    ${s.recentInjections?.length ? `
    <div class="section">
      <h2>🚨 Recent Injection Attempts</h2>
      <table>
        <tr><th>Time</th><th>Location</th></tr>
        ${s.recentInjections.map(i => `<tr><td>${new Date(i.created_at).toLocaleString()}</td><td>${i.city}, ${i.country}</td></tr>`).join('')}
      </table>
    </div>` : ''}

    ${s.hourlyStats?.length ? `
    <div class="section">
      <h2>📊 Hourly Activity</h2>
      <table>
        <tr><th>Hour</th><th>Requests</th><th>Injections</th></tr>
        ${s.hourlyStats.slice(0, 12).map(h => `<tr><td>${new Date(h.hour).toLocaleString('en-US', { hour: '2-digit', month: 'short', day: 'numeric' })}</td><td>${h.requests}</td><td>${h.injections || 0}</td></tr>`).join('')}
      </table>
    </div>` : ''}

    <p class="ts">Generated: ${new Date().toLocaleString()}</p>
  </div>
  <button class="refresh" onclick="location.reload()">↻ Refresh</button>
</body></html>`;
}
