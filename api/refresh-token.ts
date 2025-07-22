import { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Auth check from CRON_SECRET
  const authHeader = req.headers.authorization;
  const expectedSecret = `Bearer ${process.env.CRON_SECRET}`;
  if (authHeader !== expectedSecret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // 2. Connect to Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_KEY!
    );

    // 3. Get the current token from Supabase
    const { data, error } = await supabase
      .from("instagram_token")
      .select("access_token")
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    console.log("Supabase fetch result:", { data, error });

    if (error || !data?.access_token) {
      throw new Error("Failed to retrieve current token");
    }

    const currentAccessToken = data.access_token; // ✅ FIXED LINE

    // 4. Call Instagram to refresh token
    const { data: refreshResponse } = await axios.get(
      "https://graph.instagram.com/refresh_access_token",
      {
        params: {
          grant_type: "ig_refresh_token",
          access_token: currentAccessToken,
        },
      }
    );

    const refreshedToken = refreshResponse.access_token;
    const expiresIn = refreshResponse.expires_in;

    // 5. Store the new token in Supabase
    const { error: insertError } = await supabase
      .from("instagram_token")
      .insert([
        {
          access_token: refreshedToken, // ✅ use correct column name
          expires_in: expiresIn,
        },
      ]);

    if (insertError) {
      throw new Error("Failed to store refreshed token in Supabase");
    }

    // 6. Done
    return res.status(200).json({
      message: "Instagram token refreshed and saved successfully.",
      expires_in: expiresIn,
    });
  } catch (err: any) {
    console.error("Token refresh error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
