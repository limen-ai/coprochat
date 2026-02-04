import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';

// Database client
const sql = neon(process.env.DATABASE_URL);

// Daily salt for IP hashing (rotates daily for privacy)
function getDailySalt() {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
}

// Hash IP with daily salt
export function hashIp(ip) {
  const salt = getDailySalt();
  return crypto.createHash('sha256').update(ip + salt).digest('hex');
}

// Geo lookup using free IP-API (no key needed, rate limited to 45/min)
export async function getGeoData(ip) {
  try {
    // Skip for localhost/private IPs
    if (ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      return { country: 'Local', region: 'Local', city: 'Local' };
    }
    
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=country,regionName,city`);
    if (!response.ok) throw new Error('Geo lookup failed');
    
    const data = await response.json();
    return {
      country: data.country || 'Unknown',
      region: data.regionName || 'Unknown', 
      city: data.city || 'Unknown'
    };
  } catch (err) {
    console.error('Geo lookup error:', err);
    return { country: 'Unknown', region: 'Unknown', city: 'Unknown' };
  }
}

// Log a request
export async function logRequest({
  ip,
  bsLevel,
  inputLength,
  injectionFlag = false,
  errorFlag = false,
  responseTimeMs
}) {
  try {
    const ipHash = hashIp(ip);
    const geo = await getGeoData(ip);
    
    await sql`
      INSERT INTO requests (ip_hash, country, region, city, bs_level, input_length, injection_flag, error_flag, response_time_ms)
      VALUES (${ipHash}, ${geo.country}, ${geo.region}, ${geo.city}, ${bsLevel}, ${inputLength}, ${injectionFlag}, ${errorFlag}, ${responseTimeMs})
    `;
    
    return { success: true };
  } catch (err) {
    console.error('Failed to log request:', err);
    return { success: false, error: err.message };
  }
}

// Check rate limit (max 20 per hour per IP)
export async function checkRateLimit(ip) {
  try {
    const ipHash = hashIp(ip);
    const result = await sql`
      SELECT COUNT(*) as count FROM requests 
      WHERE ip_hash = ${ipHash} 
      AND created_at > NOW() - INTERVAL '1 hour'
    `;
    
    const count = parseInt(result[0].count);
    return {
      allowed: count < 20,
      count,
      limit: 20,
      remaining: Math.max(0, 20 - count)
    };
  } catch (err) {
    console.error('Rate limit check failed:', err);
    // Fail open - allow request if we can't check
    return { allowed: true, count: 0, limit: 20, remaining: 20, error: err.message };
  }
}

// Check for injection spike (10+ in last hour)
export async function checkInjectionSpike() {
  try {
    const result = await sql`
      SELECT COUNT(*) as count FROM requests 
      WHERE injection_flag = true 
      AND created_at > NOW() - INTERVAL '1 hour'
    `;
    return parseInt(result[0].count);
  } catch (err) {
    console.error('Injection spike check failed:', err);
    return 0;
  }
}

// Get stats for dashboard
export async function getDashboardStats(hours = 24) {
  try {
    const [
      totalRequests,
      uniqueIps,
      injectionAttempts,
      errors,
      avgResponseTime,
      topCountries,
      topCities,
      recentInjections,
      hourlyStats
    ] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM requests WHERE created_at > NOW() - INTERVAL '${sql.unsafe(String(hours))} hours'`.then(r => parseInt(r[0].count)),
      sql`SELECT COUNT(DISTINCT ip_hash) as count FROM requests WHERE created_at > NOW() - INTERVAL '${sql.unsafe(String(hours))} hours'`.then(r => parseInt(r[0].count)),
      sql`SELECT COUNT(*) as count FROM requests WHERE injection_flag = true AND created_at > NOW() - INTERVAL '${sql.unsafe(String(hours))} hours'`.then(r => parseInt(r[0].count)),
      sql`SELECT COUNT(*) as count FROM requests WHERE error_flag = true AND created_at > NOW() - INTERVAL '${sql.unsafe(String(hours))} hours'`.then(r => parseInt(r[0].count)),
      sql`SELECT COALESCE(AVG(response_time_ms), 0)::integer as avg FROM requests WHERE created_at > NOW() - INTERVAL '${sql.unsafe(String(hours))} hours'`.then(r => parseInt(r[0].avg)),
      sql`SELECT country, COUNT(*) as count FROM requests WHERE created_at > NOW() - INTERVAL '${sql.unsafe(String(hours))} hours' GROUP BY country ORDER BY count DESC LIMIT 5`,
      sql`SELECT city, country, COUNT(*) as count FROM requests WHERE created_at > NOW() - INTERVAL '${sql.unsafe(String(hours))} hours' GROUP BY city, country ORDER BY count DESC LIMIT 5`,
      sql`SELECT created_at, country, city FROM requests WHERE injection_flag = true ORDER BY created_at DESC LIMIT 10`,
      sql`
        SELECT 
          DATE_TRUNC('hour', created_at) as hour,
          COUNT(*) as requests,
          COUNT(*) FILTER (WHERE injection_flag = true) as injections
        FROM requests 
        WHERE created_at > NOW() - INTERVAL '${sql.unsafe(String(hours))} hours'
        GROUP BY DATE_TRUNC('hour', created_at)
        ORDER BY hour DESC
        LIMIT 24
      `
    ]);
    
    return {
      totalRequests,
      uniqueIps,
      injectionAttempts,
      errors,
      avgResponseTime,
      topCountries,
      topCities,
      recentInjections,
      hourlyStats
    };
  } catch (err) {
    console.error('Dashboard stats failed:', err);
    return { error: err.message };
  }
}

export { sql };
