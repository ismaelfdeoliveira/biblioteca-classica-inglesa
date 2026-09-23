// Edge function: verify-face
// Receives a base64-encoded face image from an authenticated client, calls the
// Face++ Detect API (https://api-us.faceplusplus.com/facepp/v3/detect) using
// server-side secrets, and — if a face is found — stores the returned face_token
// on the user's profile row in the `profiles` table.
//
// Secrets (configured in the Supabase project dashboard / edge function secrets):
//   - FACEPP_API_KEY
//   - FACEPP_API_SECRET
// These are NEVER sent to the frontend.

import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const FACEPP_ENDPOINT = "https://api-us.faceplusplus.com/facepp/v3/detect";

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

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the caller's JWT and resolve their user id by creating a client
    // with their access token and asking auth.getUser().
    const userClient = createClient(supabaseUrl, token, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = await req.json();
    const imageBase64: string | undefined = body?.image_base64;
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return new Response(JSON.stringify({ error: "No image provided." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Strip any data: prefix so we send raw base64 to Face++.
    const rawBase64 = imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, "");

    // Face++ expects multipart/form-data. We build it by hand to avoid deps.
    const boundary = "----faceverify" + Math.random().toString(16).slice(2);
    const formData =
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="api_key"\r\n\r\n${apiKey}\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="api_secret"\r\n\r\n${apiSecret}\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="image_base64"\r\n\r\n${rawBase64}\r\n` +
      `--${boundary}--\r\n`;

    const faceRes = await fetch(FACEPP_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
      body: formData,
    });

    const faceJson = await faceRes.json();
    if (!faceRes.ok) {
      return new Response(
        JSON.stringify({
          error: "Face++ request failed.",
          detail: faceJson?.error_message ?? `HTTP ${faceRes.status}`,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const faces = Array.isArray(faceJson?.faces) ? faceJson.faces : [];
    if (faces.length === 0) {
      return new Response(
        JSON.stringify({
          detected: false,
          message:
            "No face detected. Please improve the lighting and center your face in the frame, then try again.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const faceToken = faces[0].face_token;
    if (!faceToken) {
      return new Response(
        JSON.stringify({ detected: false, message: "Face token unavailable." }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Persist the face_token on the user's profile using the service role key.
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: updateError } = await adminClient
      .from("profiles")
      .update({ face_token: faceToken })
      .eq("id", userId);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: "Could not save face token to your profile." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        detected: true,
        face_token: faceToken,
        message: "Face verified successfully.",
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
