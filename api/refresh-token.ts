export default async function handler(req, res) {
    const currentToken = process.env.IG_CURRENT_TOKEN;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;
  
    if (!currentToken || !supabaseUrl || !supabaseKey) {
      return res.status(500).json({ success: false, message: "Missing env vars" });
    }
  
    try {
      const result = await fetch(
        `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${currentToken}`
      ).then((res) => res.json());
  
      if (!result.access_token) {
        return res.status(500).json({ success: false, message: "Failed to refresh token", result });
      }
  
      const newToken = result.access_token;
  
      await fetch(`${supabaseUrl}/rest/v1/instagram_token`, {
        method: "POST",
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ token: newToken }),
      });
  
      return res.status(200).json({
        success: true,
        message: "Token refreshed successfully",
        token: newToken,
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
  