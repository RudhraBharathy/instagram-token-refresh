# Instagram Token Refresh

A **serverless cron-based service** built with **Vercel** that automatically refreshes **Instagram long-lived access tokens** before they expire.  
It ensures uninterrupted access to the Instagram Graph API with **zero manual intervention**.

This service powers the Instagram integration on my portfolio’s <a href="https://rudhrabharathy.github.io/gallery" target="_blank" rel="noopener noreferrer">Gallery page</a>, keeping Instagram posts consistently available and up to date.

---

## 🚀 Features

- **Automatic Token Refresh**  
  Safely refreshes Instagram long-lived access tokens before expiration

- **Vercel Cron Jobs**  
  Runs on a scheduled cron (every 30 days) with no external scheduler

- **Persistent Storage with Neon**  
  Uses **Neon Serverless Postgres** (no auto-pause, production-safe)

- **Failure Alerts**  
  Sends email notifications via **Resend** if refresh fails

- **Secure by Design**  
  Protected with a secret Authorization header (cron-only access)

- **Fully Serverless**  
  No servers, no background workers, minimal maintenance

---

## 🛠️ Tech Stack

- Runtime: Vercel Serverless Functions (Node.js)
- Database: Neon Serverless Postgres
- Scheduling: Vercel Cron Jobs
- Email: Resend
- Language: TypeScript
- HTTP Client: Axios

---

## 🧠 Architecture Overview

```json
Vercel Cron
   ↓
/api/refresh-token
   ↓
Neon Serverless Postgres
   ↓
Instagram Graph API
   ↓
(Optional) Email Alert via Resend
```

---
## ⏱️ Cron Job Schedule

The application runs every 15 days using Vercel's cron job feature:

```json
{
  "crons": [
    {
      "path": "/api/refresh-token",
      "schedule": "0 0 */30 * *"
    }
  ]
}
```
---

## ⚙️ Token Refresh Process

1. **Token Retrieval**: Fetches the latest token from Neon database
2. **Expiration Check**: Calculates days remaining until token expiration
3. **Early Refresh**: If token expires in less than 10 days, triggers refresh
4. **API Call**: Calls Instagram's refresh endpoint with current token
5. **Database Update**: Stores the new token in NeonDB
6. **Error Handling**: Sends email alerts if refresh fails

---

## 🔐 Security

**Endpoint is not public**

**Requires Authorization header:**

```http
Authorization: Bearer <CRON_SECRET>
```

**Requests without the correct secret return:**

```json
{ "error": "Unauthorized" }
```