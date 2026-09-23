// Edge function: login-face
// Face-recognition login alternative. Receives an email and a base64 face
// image. Looks up the user's stored face_token in profiles, calls the Face++
// Compare API to check if the captured face matches. If confidence >= 80%,
// generates a magic-link token via the admin API and returns it so the
// frontend can establish a session with verifyOtp — skipping SMS 2FA since
// the face IS the second factor.
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
      return new Response(
        JSON.stringify({ error: "No account found with that email." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the stored face_token from the user's profile.
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("face_token, full_name, phone")
      .eq("id", matchedUser.id)
      .maybeSingle();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "Profile not found." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!profile.face_token) {
      return new Response(
        JSON.stringify({
          error:
            "Face recognition is not set up for this account. Please sign in with email and password.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Compare the captured face with the stored face_token via Face++.
    const rawBase64 = imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, "");

    const boundary = "----facecompare" + Math.random().toString(16).slice(2);
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
          error: "Face comparison failed.",
          detail: compareJson?.error_message ?? `HTTP ${compareRes.status}`,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const confidence: number | undefined = compareJson?.confidence;

    if (confidence === undefined || confidence === null) {
      return new Response(
        JSON.stringify({ error: "Could not compare faces. Please try again." }),
        {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (confidence < CONFIDENCE_THRESHOLD) {
      return new Response(
        JSON.stringify({
          recognized: false,
          confidence,
          threshold: CONFIDENCE_THRESHOLD,
          message: "Face not recognized. Please try again or use email and password login.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Face matched — generate a magic-link token for server-side session creation.
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email: matchedUser.email!,
    });

    if (linkError || !linkData) {
      return new Response(
        JSON.stringify({ error: "Could not create a session. Please use email and password login." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const properties = linkData.properties as Record<string, string> | undefined;
    const otpToken = properties?.hashed_token;

    if (!otpToken) {
      return new Response(
        JSON.stringify({ error: "Could not generate a session token." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        recognized: true,
        confidence,
        threshold: CONFIDENCE_THRESHOLD,
        otp_token: otpToken,
        email: matchedUser.email,
        profile: {
          full_name: profile.full_name ?? "",
          email: matchedUser.email ?? "",
          phone: profile.phone ?? "",
          face_token: profile.face_token ?? "",
        },
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
