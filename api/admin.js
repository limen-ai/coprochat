import { getDashboardStats, checkInjectionSpike } from './lib/analytics.js';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// Check for active alerts
async function checkAlertConditions() {
  const alerts = [];
  const injectionCount = await checkInjectionSpike();
  
  if (injectionCount >= 10) {
    alerts.push({
      type: 'injection_spike',
      severity: injectionCount >= 20 ? 'critical' : 'high',
      message: `${injectionCount} injection attempts in last hour`
    });
  }
  
  return alerts;
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // === AUTHENTICATION ===
  // Check Authorization header (Bearer token) or ?token= query param
  const authHeader = req.headers.authorization;
  const queryToken = req.query?.token;
  const providedToken = authHeader?.replace('Bearer ', '') || queryToken;
  
  if (!ADMIN_PASSWORD) {
    // No password configured - block access entirely in production
    return res.status(503).json({ 
      error: 'Admin dashboard not configured. Set ADMIN_PASSWORD env var.' 
    });
  }
  
  if (providedToken !== ADMIN_PASSWORD) {
    // Return login page for GET, 401 for API
    if (req.method === 'GET' && !queryToken) {
      return res.send(generateLoginHtml());
    }
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const stats = await getDashboardStats(24);
    const alerts = await checkAlertConditions();
    
    if (req.method === 'POST') {
      // Return JSON for API requests
      return res.json({ stats, alerts });
    }
    
    // Return HTML dashboard for GET requests
    const html = generateDashboardHtml(stats, alerts);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
    
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
}

function generateLoginHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CoproChat Admin</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .login-box {
      background: #1e293b;
      border-radius: 12px;
      padding: 2rem;
      border: 1px solid #334155;
      width: 100%;
      max-width: 400px;
    }
    h1 { 
      font-size: 1.5rem; 
      margin-bottom: 1.5rem;
      text-align: center;
    }
    input {
      width: 100%;
      padding: 0.75rem 1rem;
      border: 1px solid #334155;
      border-radius: 8px;
      background: #0f172a;
      color: #e2e8f0;
      font-size: 1rem;
      margin-bottom: 1rem;
    }
    input:focus { outline: none; border-color: #f59e0b; }
    button {
      width: 100%;
      padding: 0.75rem 1rem;
      background: #f59e0b;
      color: #0f172a;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
    }
    button:hover { background: #d97706; }
  </style>
</head>
<body>
  <div class="login-box">
    <h1>💩 CoproChat Admin</h1>
    <form onsubmit="login(event)">
      <input type="password" id="token" placeholder="Admin token" autofocus />
      <button type="submit">Access Dashboard</button>
    </form>
  </div>
  <script>
    function login(e) {
      e.preventDefault();
      const token = document.getElementById('token').value;
      window.location.href = '/api/admin?token=' + encodeURIComponent(token);
    }
  </script>
</body>
</html>`;
}

function generateDashboardHtml(stats, alerts = []) {
  const formatNumber = (n) => n?.toLocaleString() || '0';
  
  const alertsHtml = alerts.length > 0 ? `
    <div class="alerts">
      ${alerts.map(a => `
        <div class="alert alert-${a.severity}">
          <strong>${a.severity.toUpperCase()}:</strong> ${a.message}
        </div>
      `).join('')}
    </div>
  ` : '';
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CoproChat Analytics</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      padding: 2rem;
      line-height: 1.6;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { 
      font-size: 2rem; 
      margin-bottom: 0.5rem;
      background: linear-gradient(90deg, #f59e0b, #eab308);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .subtitle { color: #64748b; margin-bottom: 2rem; }
    
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    
    .card {
      background: #1e293b;
      border-radius: 12px;
      padding: 1.5rem;
      border: 1px solid #334155;
    }
    .card h3 {
      font-size: 0.875rem;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.5rem;
    }
    .card .value {
      font-size: 2rem;
      font-weight: 700;
      color: #f8fafc;
    }
    .card.alert .value { color: #ef4444; }
    .card.warning .value { color: #f59e0b; }
    .card.success .value { color: #22c55e; }
    
    .section {
      background: #1e293b;
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1rem;
      border: 1px solid #334155;
    }
    .section h2 {
      font-size: 1.125rem;
      margin-bottom: 1rem;
      color: #f1f5f9;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }
    th, td {
      text-align: left;
      padding: 0.75rem;
      border-bottom: 1px solid #334155;
    }
    th {
      color: #94a3b8;
      font-weight: 500;
    }
    tr:last-child td { border-bottom: none; }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .badge-danger { background: #ef444420; color: #ef4444; }
    .badge-warning { background: #f59e0b20; color: #f59e0b; }
    .badge-success { background: #22c55e20; color: #22c55e; }
    
    .refresh {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      background: #f59e0b;
      color: #0f172a;
      border: none;
      padding: 1rem 1.5rem;
      border-radius: 50px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
      transition: transform 0.2s;
    }
    .refresh:hover { transform: scale(1.05); }
    
    .timestamp {
      color: #64748b;
      font-size: 0.875rem;
      margin-top: 2rem;
    }
    
    .two-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    @media (max-width: 768px) {
      .two-col { grid-template-columns: 1fr; }
      body { padding: 1rem; }
    }
    
    .alerts { margin-bottom: 1.5rem; }
    .alert {
      padding: 1rem 1.25rem;
      border-radius: 8px;
      margin-bottom: 0.5rem;
      font-weight: 500;
    }
    .alert-critical { background: #dc262620; border: 1px solid #dc2626; color: #fca5a5; }
    .alert-high { background: #ea580c20; border: 1px solid #ea580c; color: #fdba74; }
    .alert-medium { background: #ca8a0420; border: 1px solid #ca8a04; color: #fde047; }
    .alert-low { background: #16a34a20; border: 1px solid #16a34a; color: #86efac; }
  </style>
</head>
<body>
  <div class="container">
    <h1>💩 CoproChat Analytics</h1>
    <p class="subtitle">Last 24 hours dashboard</p>
    
    ${alertsHtml}
    
    <div class="grid">
      <div class="card">
        <h3>Total Requests</h3>
        <div class="value">${formatNumber(stats.totalRequests)}</div>
      </div>
      <div class="card">
        <h3>Unique Visitors</h3>
        <div class="value">${formatNumber(stats.uniqueIps)}</div>
      </div>
      <div class="card ${stats.injectionAttempts > 0 ? 'alert' : ''}">
        <h3>Injection Attempts</h3>
        <div class="value">${formatNumber(stats.injectionAttempts)}</div>
      </div>
      <div class="card ${stats.errors > 0 ? 'warning' : ''}">
        <h3>Errors</h3>
        <div class="value">${formatNumber(stats.errors)}</div>
      </div>
      <div class="card">
        <h3>Avg Response Time</h3>
        <div class="value">${formatNumber(stats.avgResponseTime)}ms</div>
      </div>
    </div>
    
    <div class="two-col">
      <div class="section">
        <h2>🌍 Top Countries</h2>
        <table>
          <tr><th>Country</th><th>Requests</th></tr>
          ${(stats.topCountries || []).map(c => 
            `<tr><td>${c.country}</td><td>${c.count}</td></tr>`
          ).join('') || '<tr><td colspan="2">No data</td></tr>'}
        </table>
      </div>
      
      <div class="section">
        <h2>🏙️ Top Cities</h2>
        <table>
          <tr><th>City</th><th>Country</th><th>Requests</th></tr>
          ${(stats.topCities || []).map(c => 
            `<tr><td>${c.city}</td><td>${c.country}</td><td>${c.count}</td></tr>`
          ).join('') || '<tr><td colspan="3">No data</td></tr>'}
        </table>
      </div>
    </div>
    
    ${stats.recentInjections?.length > 0 ? `
    <div class="section">
      <h2>🚨 Recent Injection Attempts</h2>
      <table>
        <tr><th>Time</th><th>Location</th></tr>
        ${stats.recentInjections.map(i => {
          const time = new Date(i.created_at).toLocaleString();
          return `<tr>
            <td>${time}</td>
            <td>${i.city}, ${i.country}</td>
          </tr>`;
        }).join('')}
      </table>
    </div>
    ` : ''}
    
    ${stats.hourlyStats?.length > 0 ? `
    <div class="section">
      <h2>📊 Hourly Activity (Last 24h)</h2>
      <table>
        <tr><th>Hour</th><th>Requests</th><th>Injections</th></tr>
        ${stats.hourlyStats.map(h => {
          const hour = new Date(h.hour).toLocaleString('en-US', { hour: '2-digit', month: 'short', day: 'numeric' });
          return `<tr>
            <td>${hour}</td>
            <td>${h.requests}</td>
            <td>${h.injections > 0 ? `<span class="badge badge-danger">${h.injections}</span>` : '0'}</td>
          </tr>`;
        }).join('')}
      </table>
    </div>
    ` : ''}
    
    <p class="timestamp">Generated: ${new Date().toLocaleString()}</p>
  </div>
  
  <button class="refresh" onclick="location.reload()">↻ Refresh</button>
</body>
</html>`;
}
