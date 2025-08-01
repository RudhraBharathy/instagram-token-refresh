# Instagram Token Refresh

A serverless application built with Vercel that automatically refreshes Instagram access tokens using cron jobs. This application ensures your Instagram API tokens remain valid by monitoring their expiration and refreshing them before they expire.

**Note**: This application is designed to run automatically and requires minimal maintenance once properly configured. It powers the Instagram integration on my portfolio’s <a href="https://rudhrabharathy.github.io/gallery" target="_blank" rel="noopener noreferrer">Gallery page</a>, ensuring that my Instagram posts remain accessible and up to date.

## 🚀 Features

- **Automatic Token Refresh**: Monitors Instagram access tokens and refreshes them before expiration
- **Cron Job Integration**: Runs every 15 days using Vercel's cron job feature
- **Database Storage**: Uses Supabase to store and manage token data
- **Email Alerts**: Sends email notifications when token refresh fails
- **Security**: Protected with authorization headers to prevent unauthorized access
- **Serverless**: Built on Vercel for scalability and cost-effectiveness

## ⚙️ How It Works

### Cron Job Schedule

The application runs every 15 days using Vercel's cron job feature:

```json
{
  "crons": [
    {
      "path": "/api/refresh-token",
      "schedule": "0 0 */15 * *"
    }
  ]
}
```

### Token Refresh Process

1. **Token Retrieval**: Fetches the latest token from Supabase database
2. **Expiration Check**: Calculates days remaining until token expiration
3. **Early Refresh**: If token expires in less than 10 days, triggers refresh
4. **API Call**: Calls Instagram's refresh endpoint with current token
5. **Database Update**: Stores the new token in Supabase
6. **Error Handling**: Sends email alerts if refresh fails