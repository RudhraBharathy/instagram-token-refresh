import { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers.authorization;
  const expectedSecret = `Bearer ${process.env.CRON_SECRET}`;
  if (authHeader !== expectedSecret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_KEY!
    );

    const { data, error } = await supabase
      .from("instagram_token")
      .select("access_token, updated_at, expires_in")
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !data?.access_token) {
      throw new Error("Failed to retrieve current token");
    }

    const updatedAt = new Date(data.updated_at);
    const expiresIn = data.expires_in ?? 5184000; // default 60 days in sec
    const expiresAt = new Date(updatedAt.getTime() + expiresIn * 1000);
    const now = new Date();

    const daysLeft = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    console.log(`Token expires in ${daysLeft} days`);

    if (daysLeft > 10) {
      return res.status(200).json({ message: `Token still valid for ${daysLeft} days.` });
    }

    const { data: refreshResponse } = await axios.get(
      "https://graph.instagram.com/refresh_access_token",
      {
        params: {
          grant_type: "ig_refresh_token",
          access_token: data.access_token,
        },
      }
    );

    const refreshedToken = refreshResponse.access_token;
    const newExpiresIn = refreshResponse.expires_in;

    const { error: insertError } = await supabase
      .from("instagram_token")
      .insert([
        {
          access_token: refreshedToken,
          expires_in: newExpiresIn,
        },
      ]);

    if (insertError) {
      throw new Error("Failed to store refreshed token in Supabase");
    }

    return res.status(200).json({
      message: "Instagram token refreshed and saved successfully.",
      expires_in: newExpiresIn,
    });
  } catch (err: any) {
    console.error("Token refresh error:", err.message);

    // 🔔 Send email alert
    try {
      await resend.emails.send({
        from: "Token Alert <noreply@onrender.email>",
        to: process.env.ALERT_EMAIL!,
        subject: "🚨 Instagram Token Refresh Failed",
        html: `<p><strong>Error:</strong> ${err.message}</p><p>Time: ${new Date().toISOString()}</p>`,
      });
    } catch (emailError: any) {
      console.error("Failed to send alert email:", emailError.message);
    }

    return res.status(500).json({ error: err.message });
  }
}
