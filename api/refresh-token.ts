import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Pool } from "pg";
import axios from "axios";
import { Resend } from "resend";

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
});

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const client = await pool.connect();

  try {
    const { rows } = await client.query(`
      SELECT access_token, expires_in, created_at
      FROM instagram_token
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (!rows.length) {
      throw new Error("No Instagram token found");
    }

    const token = rows[0];
    const expiresAt =
      new Date(token.created_at).getTime() + token.expires_in * 1000;

    const daysLeft = Math.floor(
      (expiresAt - Date.now()) / (1000 * 60 * 60 * 24)
    );

    if (daysLeft > 10) {
      return res.status(200).json({
        message: `Token still valid for ${daysLeft} days`,
      });
    }

    const { data } = await axios.get(
      "https://graph.instagram.com/refresh_access_token",
      {
        params: {
          grant_type: "ig_refresh_token",
          access_token: token.access_token,
        },
      }
    );

    await client.query(
      `
      INSERT INTO instagram_token (access_token, expires_in)
      VALUES ($1, $2)
    `,
      [data.access_token, data.expires_in]
    );

    return res.status(200).json({
      message: "Instagram token refreshed successfully",
      expires_in: data.expires_in,
    });
  } catch (err: any) {
    try {
      await resend.emails.send({
        from: "Token Alert <onboarding@resend.dev>",
        to: process.env.ALERT_EMAIL!,
        subject: "🚨 Instagram Token Refresh Failed",
        html: `<p><strong>Error:</strong> ${err.message}</p>
               <p>${new Date().toISOString()}</p>`,
      });
    } catch {}

    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}
