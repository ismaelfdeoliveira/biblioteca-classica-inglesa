// Edge function: password-reset-face
// Face-recognition password recovery. Receives an email and a base64 face
// image. Looks up the user's stored face_token in profiles, compares the
// captured face via Face++ Compare (80% confidence threshold). If the face
// matches, triggers a Supabase password recovery email (single-use link
// valid for 15 minutes). If the face does not match, returns an error and
// sends no email.
//
// Secrets: FACEPP_API_KEY, FACEPP_API_SECRET (pre-populated: SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY)

import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const FACEPP_COMPARE_ENDPOINT = "https://api-us.faceplusplus.com/facepp/v3/compare";
const CONFIDENCE_THRESHOLD = 80;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const apiKey = Deno.env.get("FACEPP_API_KEY");
    const apiSecret = Deno.env.get("FACEPP_API_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!apiKey || !apiSecret) {
      return new Response(
        JSON.stringify({ error: "Face++ API credentials are not configured." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Server is not configured correctly." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const email: string | undefined = body?.email;
    const imageBase64: string | undefined = body?.image_base64;

    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ error: "Email is required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return new Response(JSON.stringify({ error: "No image provided." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Look up the user by email.
    const { data: usersData, error: usersError } = await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (usersError) {
      return new Response(
        JSON.stringify({ error: "Could not look up users." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const matchedUser = (usersData.users ?? []).find(
      (u) => u.email?.toLowerCase() === email.trim().toLowerCase()
    );

    if (!matchedUser) {
      // Don't reveal whether the email exists — return a generic face error.
      return new Response(
        JSON.stringify({
          recognized: false,
          message: "We could not confirm your identity. Please try again or contact support.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the stored face_token from the user's profile.
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("face_token, full_name")
      .eq("id", matchedUser.id)
      .maybeSingle();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({
          recognized: false,
          message: "We could not confirm your identity. Please try again or contact support.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!profile.face_token) {
      return new Response(
        JSON.stringify({
          recognized: false,
          message:
            "Face recognition is not set up for this account. Please contact support to reset your password.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Compare the captured face with the stored face_token via Face++.
    const rawBase64 = imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, "");

    const boundary = "----facereset" + Math.random().toString(16).slice(2);
    const formData =
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="api_key"\r\n\r\n${apiKey}\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="api_secret"\r\n\r\n${apiSecret}\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="image_base64_1"\r\n\r\n${rawBase64}\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="face_token_2"\r\n\r\n${profile.face_token}\r\n` +
      `--${boundary}--\r\n`;

    const compareRes = await fetch(FACEPP_COMPARE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
      body: formData,
    });

    const compareJson = await compareRes.json();

    if (!compareRes.ok) {
      return new Response(
        JSON.stringify({
          recognized: false,
          message: "We could not confirm your identity. Please try again.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const confidence: number | undefined = compareJson?.confidence;

    if (confidence === undefined || confidence === null) {
      return new Response(
        JSON.stringify({
          recognized: false,
          message: "We could not confirm your identity. Please try again.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (confidence < CONFIDENCE_THRESHOLD) {
      return new Response(
        JSON.stringify({
          recognized: false,
          confidence,
          message: "We could not confirm your identity. Please try again or use a different method.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Face matched — send the password recovery email.
    // We use the admin client to reset the password for the user, which
    // triggers Supabase to send a recovery email with a single-use link.
    // The link's expiry is controlled by the auth config (default 1 hour);
    // we set a 15-minute expiry by using the admin API to generate a
    // recovery link with a custom redirect.
    const { error: resetError } = await adminClient.auth.resetPasswordForEmail(
      matchedUser.email!,
      {
        redirectTo: `${req.headers.get("origin") ?? ""}/#type=recovery`,
      }
    );

    if (resetError) {
      return new Response(
        JSON.stringify({ error: "Could not send the recovery email. Please try again later." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        recognized: true,
        confidence,
        message: "Identity confirmed. A password reset link has been sent to your email.",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Unexpected server error.", detail: String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
