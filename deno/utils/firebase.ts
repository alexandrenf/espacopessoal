import {
  FIREBASE_ADMIN_CLIENT_EMAIL,
  FIREBASE_ADMIN_PRIVATE_KEY,
} from "../config/env.ts";

export async function getAccessToken(): Promise<string> {
  console.log("[Firebase] Starting access token generation");
  try {
    const now = Math.floor(Date.now() / 1000);
    const hour = 3600;
  
    const header = { alg: "RS256", typ: "JWT" };
    const payload = {
      iss: FIREBASE_ADMIN_CLIENT_EMAIL,
      sub: FIREBASE_ADMIN_CLIENT_EMAIL,
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + hour,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
    };

    // Convert private key from PEM format to CryptoKey
    const privateKeyBuffer = new TextEncoder().encode(FIREBASE_ADMIN_PRIVATE_KEY);
    const privateKey = await crypto.subtle.importKey(
      "pkcs8",
      privateKeyBuffer,
      {
        name: "RSASSA-PKCS1-v1_5",
        hash: "SHA-256",
      },
      false,
      ["sign"]
    );

    // Create the JWT segments
    const encodedHeader = btoa(JSON.stringify(header));
    const encodedPayload = btoa(JSON.stringify(payload));
    const signInput = `${encodedHeader}.${encodedPayload}`;

    // Sign the input
    const signature = await crypto.subtle.sign(
      { name: "RSASSA-PKCS1-v1_5" },
      privateKey,
      new TextEncoder().encode(signInput)
    );

    // Convert signature to base64
    const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)));

    // Combine to create the JWT
    const jwt = `${encodedHeader}.${encodedPayload}.${encodedSignature}`;

    console.log("[Firebase] Successfully generated JWT");
    
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("[Firebase] Failed to get access token:", {
        status: response.status,
        data,
        timestamp: new Date().toISOString()
      });
      throw new Error(`Failed to get access token: ${data.error}`);
    }

    console.log("[Firebase] Successfully obtained access token");
    return data.access_token;
  } catch (error) {
    console.error("[Firebase] Error generating access token:", {
      error,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}
