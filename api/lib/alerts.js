import { sql, checkInjectionSpike } from './analytics.js';

const ALERT_EMAIL = process.env.ALERT_EMAIL || 'borisk@fastmail.com';
const INJECTION_SPIKE_THRESHOLD = 10; // Alert if 10+ injections in 1 hour

// Simple email via Resend (we'll add the package)
export async function sendAlert({ type, severity, details }) {
  try {
    // Store alert in database
    await sql`
      INSERT INTO alert_log (alert_type, severity, details, sent_to)
      VALUES (${type}, ${severity}, ${JSON.stringify(details)}, ${ALERT_EMAIL})
    `;
    
    // If Resend is configured, send email
    if (process.env.RESEND_API_KEY) {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      
      await resend.emails.send({
        from: 'CoproChat Alerts <alerts@copro.chat>',
        to: ALERT_EMAIL,
        subject: `[${severity.toUpperCase()}] CoproChat ${type} Alert`,
        html: generateAlertEmail({ type, severity, details })
      });
    }
    
    console.log(`Alert sent: ${type} (${severity})`);
    return { success: true };
  } catch (err) {
    console.error('Failed to send alert:', err);
    return { success: false, error: err.message };
  }
}

export async function checkAndAlert() {
  try {
    // Check injection spike
    const injectionCount = await checkInjectionSpike();
    
    if (injectionCount >= INJECTION_SPIKE_THRESHOLD) {
      // Check if we already sent an alert in the last hour
      const recentAlert = await sql`
        SELECT COUNT(*) as count FROM alert_log 
        WHERE alert_type = 'injection_spike' 
        AND created_at > NOW() - INTERVAL '1 hour'
      `;
      
      if (parseInt(recentAlert[0].count) === 0) {
        await sendAlert({
          type: 'injection_spike',
          severity: injectionCount >= 20 ? 'critical' : 'high',
          details: {
            count: injectionCount,
            threshold: INJECTION_SPIKE_THRESHOLD,
            window: '1 hour'
          }
        });
      }
    }
    
    // Check error spike
    const errorCount = await sql`
      SELECT COUNT(*) as count FROM requests 
      WHERE error_flag = true 
      AND created_at > NOW() - INTERVAL '1 hour'
    `;
    
    if (parseInt(errorCount[0].count) >= 10) {
      const recentAlert = await sql`
        SELECT COUNT(*) as count FROM alert_log 
        WHERE alert_type = 'error_spike' 
        AND created_at > NOW() - INTERVAL '1 hour'
      `;
      
      if (parseInt(recentAlert[0].count) === 0) {
        await sendAlert({
          type: 'error_spike',
          severity: 'medium',
          details: {
            count: parseInt(errorCount[0].count),
            window: '1 hour'
          }
        });
      }
    }
    
    return { checked: true };
  } catch (err) {
    console.error('Alert check failed:', err);
    return { checked: false, error: err.message };
  }
}

function generateAlertEmail({ type, severity, details }) {
  const colors = {
    critical: '#dc2626',
    high: '#ea580c',
    medium: '#ca8a04',
    low: '#16a34a'
  };
  
  const titles = {
    injection_spike: '🚨 Injection Attack Spike Detected',
    error_spike: '⚠️ Error Rate Spike Detected',
    rate_limit: '📊 Rate Limit Alerts'
  };
  
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: sans-serif; background: #f8fafc; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header { background: ${colors[severity]}; color: white; padding: 24px; }
    .header h1 { margin: 0; font-size: 20px; }
    .content { padding: 24px; }
    .stat { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e2e8f0; }
    .stat:last-child { border-bottom: none; }
    .footer { background: #f1f5f9; padding: 16px 24px; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${titles[type] || type}</h1>
      <p>Severity: ${severity.toUpperCase()}</p>
    </div>
    <div class="content">
      <div class="stat">
        <span>Count:</span>
        <strong>${details.count}</strong>
      </div>
      ${details.threshold ? `
      <div class="stat">
        <span>Threshold:</span>
        <strong>${details.threshold}</strong>
      </div>
      ` : ''}
      <div class="stat">
        <span>Time Window:</span>
        <strong>${details.window}</strong>
      </div>
      <div class="stat">
        <span>Timestamp:</span>
        <strong>${new Date().toLocaleString()}</strong>
      </div>
    </div>
    <div class="footer">
      <p>CoproChat Analytics — <a href="https://copro.chat/api/admin">View Dashboard</a></p>
      <p>To change alert settings, update environment variables in Vercel.</p>
    </div>
  </div>
</body>
</html>`;
}
