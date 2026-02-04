import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';

const sql = neon(process.env.DATABASE_URL);

// Hash IP with daily salt for privacy
function hashIp(ip) {
  const salt = new Date().toISOString().split('T')[0];
  return crypto.createHash('sha256').update(ip + salt).digest('hex');
}

// Geo lookup (free IP-API, 45/min limit)
async function getGeoData(ip) {
  if (!ip || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip === 'unknown') {
    return { country: 'Local', region: 'Local', city: 'Local' };
  }
  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=country,regionName,city`);
    if (!res.ok) return { country: 'Unknown', region: 'Unknown', city: 'Unknown' };
    const data = await res.json();
    return {
      country: data.country || 'Unknown',
      region: data.regionName || 'Unknown',
      city: data.city || 'Unknown'
    };
  } catch {
    return { country: 'Unknown', region: 'Unknown', city: 'Unknown' };
  }
}

// Log a request
export async function logRequest({ ip, bsLevel, inputLength, injectionFlag = false, errorFlag = false, responseTimeMs }) {
  try {
    const ipHash = hashIp(ip);
    const geo = await getGeoData(ip);
    await sql`
      INSERT INTO requests (ip_hash, country, region, city, bs_level, input_length, injection_flag, error_flag, response_time_ms)
      VALUES (${ipHash}, ${geo.country}, ${geo.region}, ${geo.city}, ${bsLevel}, ${inputLength}, ${injectionFlag}, ${errorFlag}, ${responseTimeMs})
    `;
    return { success: true };
  } catch (err) {
    console.error('logRequest error:', err);
    return { success: false };
  }
}

// Rate limit: 20/hour per IP
export async function checkRateLimit(ip) {
  try {
    const ipHash = hashIp(ip);
    const result = await sql`
      SELECT COUNT(*)::int as count FROM requests 
      WHERE ip_hash = ${ipHash} AND created_at > NOW() - INTERVAL '1 hour'
    `;
    const count = result[0]?.count || 0;
    return { allowed: count < 20, count, remaining: Math.max(0, 20 - count) };
  } catch (err) {
    console.error('checkRateLimit error:', err);
    return { allowed: true, count: 0, remaining: 20 }; // Fail open
  }
}

// Dashboard stats
export async function getDashboardStats() {
  try {
    // Run queries in parallel
    const [basic, countries, cities, injections, hourly] = await Promise.all([
      sql`
        SELECT 
          COUNT(*)::int as total,
          COUNT(DISTINCT ip_hash)::int as unique_ips,
          COUNT(*) FILTER (WHERE injection_flag)::int as injections,
          COUNT(*) FILTER (WHERE error_flag)::int as errors,
          COALESCE(AVG(response_time_ms), 0)::int as avg_time
        FROM requests WHERE created_at > NOW() - INTERVAL '24 hours'
      `,
      sql`
        SELECT country, COUNT(*)::int as count 
        FROM requests WHERE created_at > NOW() - INTERVAL '24 hours' 
        GROUP BY country ORDER BY count DESC LIMIT 5
      `,
      sql`
        SELECT city, country, COUNT(*)::int as count 
        FROM requests WHERE created_at > NOW() - INTERVAL '24 hours' 
        GROUP BY city, country ORDER BY count DESC LIMIT 5
      `,
      sql`
        SELECT created_at, country, city 
        FROM requests WHERE injection_flag = true 
        ORDER BY created_at DESC LIMIT 10
      `,
      sql`
        SELECT 
          DATE_TRUNC('hour', created_at) as hour,
          COUNT(*)::int as requests,
          COUNT(*) FILTER (WHERE injection_flag)::int as injections
        FROM requests WHERE created_at > NOW() - INTERVAL '24 hours'
        GROUP BY 1 ORDER BY 1 DESC LIMIT 24
      `
    ]);

    const b = basic[0] || {};
    return {
      totalRequests: b.total || 0,
      uniqueIps: b.unique_ips || 0,
      injectionAttempts: b.injections || 0,
      errors: b.errors || 0,
      avgResponseTime: b.avg_time || 0,
      topCountries: countries,
      topCities: cities,
      recentInjections: injections,
      hourlyStats: hourly
    };
  } catch (err) {
    console.error('getDashboardStats error:', err);
    throw err;
  }
}
