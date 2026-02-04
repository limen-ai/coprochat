import { createHash } from 'crypto';
import { sql } from '@vercel/postgres';

// Get daily salt for IP hashing (rotates daily for privacy)
function getSalt() {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
}

// Hash IP with daily salt
export function hashIP(ip) {
  const salt = getSalt();
  return createHash('sha256').update(ip + salt).digest('hex').slice(0, 32);
}

// Geo lookup using free ipapi.co (no API key needed, rate limited)
export async function getGeoData(ip) {
  try {
    // Skip for private/local IPs
    if (ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      return { country: 'Local', region: 'Local', city: 'Local' };
    }
    
    const response = await fetch(`https://ipapi.co/${ip}/json/`, {
      headers: { 'User-Agent': 'coprochat/1.0' }
    });
    
    if (!response.ok) return { country: null, region: null, city: null };
    
    const data = await response.json();
    return {
      country: data.country_name || data.country || null,
      region: data.region || null,
      city: data.city || null
    };
  } catch (error) {
    console.error('Geo lookup failed:', error);
    return { country: null, region: null, city: null };
  }
}

// Log request to database
export async function logRequest({ ipHash, country, region, city, bsLevel, inputLength, injectionFlag, errorFlag, responseTimeMs }) {
  try {
    await sql`
      INSERT INTO requests (ip_hash, country, region, city, bs_level, input_length, injection_flag, error_flag, response_time_ms, salt_date)
      VALUES (${ipHash}, ${country}, ${region}, ${city}, ${bsLevel}, ${inputLength}, ${injectionFlag}, ${errorFlag}, ${responseTimeMs}, CURRENT_DATE)
    `;
  } catch (error) {
    console.error('Failed to log request:', error);
    // Don't fail the request if logging fails
  }
}

// Check rate limit (max 30 requests per hour per IP)
export async function checkRateLimit(ipHash) {
  try {
    const result = await sql`
      SELECT COUNT(*) as count FROM requests 
      WHERE ip_hash = ${ipHash} 
      AND created_at > NOW() - INTERVAL '1 hour'
    `;
    return {
      allowed: result.rows[0].count < 30,
      current: parseInt(result.rows[0].count),
      limit: 30
    };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    // Allow on error (fail open)
    return { allowed: true, current: 0, limit: 30 };
  }
}

// Get stats for admin dashboard
export async function getStats(hours = 24) {
  try {
    // Recent requests
    const recent = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT ip_hash) as unique_ips,
        COUNT(*) FILTER (WHERE injection_flag = TRUE) as injections,
        COUNT(*) FILTER (WHERE error_flag = TRUE) as errors,
        AVG(response_time_ms)::INTEGER as avg_response_time
      FROM requests 
      WHERE created_at > NOW() - INTERVAL '${hours} hours'
    `;

    // Top cities
    const cities = await sql`
      SELECT city, country, COUNT(*) as count
      FROM requests
      WHERE created_at > NOW() - INTERVAL '${hours} hours'
      AND city IS NOT NULL
      GROUP BY city, country
      ORDER BY count DESC
      LIMIT 10
    `;

    // BS level distribution
    const bsLevels = await sql`
      SELECT bs_level, COUNT(*) as count
      FROM requests
      WHERE created_at > NOW() - INTERVAL '${hours} hours'
      AND bs_level IS NOT NULL
      GROUP BY bs_level
      ORDER BY bs_level
    `;

    // Hourly breakdown
    const hourly = await sql`
      SELECT 
        DATE_TRUNC('hour', created_at) as hour,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE injection_flag = TRUE) as injections
      FROM requests
      WHERE created_at > NOW() - INTERVAL '${hours} hours'
      GROUP BY DATE_TRUNC('hour', created_at)
      ORDER BY hour
    `;

    // Recent injection attempts (for review)
    const recentInjections = await sql`
      SELECT created_at, ip_hash, country, city
      FROM requests
      WHERE injection_flag = TRUE
      AND created_at > NOW() - INTERVAL '${hours} hours'
      ORDER BY created_at DESC
      LIMIT 20
    `;

    return {
      summary: recent.rows[0],
      cities: cities.rows,
      bsLevels: bsLevels.rows,
      hourly: hourly.rows,
      recentInjections: recentInjections.rows
    };
  } catch (error) {
    console.error('Stats query failed:', error);
    throw error;
  }
}

// Check for alert conditions
export async function checkAlertConditions() {
  const alerts = [];
  
  try {
    // Check for injection spike (5+ in last 15 minutes)
    const injectionSpike = await sql`
      SELECT COUNT(*) as count FROM requests
      WHERE injection_flag = TRUE
      AND created_at > NOW() - INTERVAL '15 minutes'
    `;
    
    if (parseInt(injectionSpike.rows[0].count) >= 5) {
      alerts.push({
        type: 'injection_spike',
        severity: 'high',
        message: `${injectionSpike.rows[0].count} injection attempts in last 15 minutes`,
        count: parseInt(injectionSpike.rows[0].count)
      });
    }

    // Check for error spike (10+ errors in last hour)
    const errorSpike = await sql`
      SELECT COUNT(*) as count FROM requests
      WHERE error_flag = TRUE
      AND created_at > NOW() - INTERVAL '1 hour'
    `;
    
    if (parseInt(errorSpike.rows[0].count) >= 10) {
      alerts.push({
        type: 'error_spike',
        severity: 'medium',
        message: `${errorSpike.rows[0].count} errors in last hour`,
        count: parseInt(errorSpike.rows[0].count)
      });
    }

    // Check for single IP hammering (20+ requests in 5 minutes)
    const hammerCheck = await sql`
      SELECT ip_hash, COUNT(*) as count
      FROM requests
      WHERE created_at > NOW() - INTERVAL '5 minutes'
      GROUP BY ip_hash
      HAVING COUNT(*) >= 20
      LIMIT 1
    `;
    
    if (hammerCheck.rows.length > 0) {
      alerts.push({
        type: 'rate_limit',
        severity: 'medium',
        message: `IP ${hammerCheck.rows[0].ip_hash.slice(0, 8)}... made ${hammerCheck.rows[0].count} requests in 5 minutes`,
        ip: hammerCheck.rows[0].ip_hash
      });
    }

    return alerts;
  } catch (error) {
    console.error('Alert check failed:', error);
    return [];
  }
}

// Log that an alert was sent
export async function logAlert(alert, sentTo) {
  try {
    await sql`
      INSERT INTO alert_log (alert_type, severity, details, sent_to)
      VALUES (${alert.type}, ${alert.severity}, ${JSON.stringify(alert)}, ${sentTo})
    `;
  } catch (error) {
    console.error('Failed to log alert:', error);
  }
}

// Check if alert was already sent recently (deduplication)
export async function wasAlertSentRecently(alertType, minutes = 30) {
  try {
    const result = await sql`
      SELECT COUNT(*) as count FROM alert_log
      WHERE alert_type = ${alertType}
      AND created_at > NOW() - INTERVAL '${minutes} minutes'
    `;
    return parseInt(result.rows[0].count) > 0;
  } catch (error) {
    return false;
  }
}
