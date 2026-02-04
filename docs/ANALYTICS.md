# CoproChat Analytics Setup

## Overview
Full analytics + misbehavior monitoring for CoproChat with:
- Request logging (IP hash, geo, BS level, response time)
- Rate limiting (20 req/hour per IP)
- Injection attempt detection + logging
- Admin dashboard at `/api/admin`
- Email alerts for spike events

## Database Setup (Neon/Vercel Postgres)

1. Create database in Vercel Dashboard → Storage → Create Postgres Database

2. Copy the connection string and add to environment variables:
   ```
   DATABASE_URL=postgres://...
   ```

3. Run the schema (in Vercel Postgres dashboard SQL editor):
   ```sql
   -- Copy contents of schema.sql and run
   ```

## Environment Variables

Add these in Vercel Dashboard → Project → Settings → Environment Variables:

| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | `postgres://...` | From Vercel Postgres |
| `ADMIN_PASSWORD` | `your-secure-password` | For dashboard access |
| `ALERT_EMAIL` | `borisk@fastmail.com` | Where alerts go |
| `RESEND_API_KEY` | `re_...` | Optional - for email alerts |
| `CRON_SECRET` | `random-string` | For securing cron endpoint |

## Email Alerts (Resend)

1. Sign up at https://resend.com
2. Verify domain (copro.chat) or use Resend's test domain
3. Copy API key to `RESEND_API_KEY`
4. Update `vercel.json` `from` address in alerts.js if using custom domain

## Deployment

```bash
# Push to deploy
git add .
git commit -m "Add analytics + monitoring"
git push origin main
```

## Admin Dashboard

Access at: `https://copro.chat/api/admin`

Features:
- 24h stats: requests, unique IPs, injection attempts, errors
- Top countries/cities
- Recent injection attempts
- Hourly activity graph

## Alert Thresholds

- **Injection Spike**: 10+ attempts in 1 hour → HIGH alert
- **Injection Spike**: 20+ attempts in 1 hour → CRITICAL alert  
- **Error Spike**: 10+ errors in 1 hour → MEDIUM alert

Alerts are rate-limited to 1 per hour per type.

## Privacy Notes

- IPs are hashed with daily salt (cannot be reversed)
- No raw input/output text stored
- Geo data is city-level, not precise location
- Data retained forever (early stage, you asked for it)

## Troubleshooting

**Database connection errors:**
- Check DATABASE_URL is set
- Verify IP allowlist in Neon dashboard includes Vercel IPs

**Geo lookup not working:**
- ip-api.com rate limit is 45/minute (free)
- Private IPs (localhost) return "Local"

**Alerts not sending:**
- Check RESEND_API_KEY is set
- Verify Resend domain is verified or use test domain
- Check alert_log table for logged alerts

## Schema

See `schema.sql` for full database schema including:
- `requests` - all API calls
- `daily_stats` - aggregated metrics
- `alert_log` - sent alerts
