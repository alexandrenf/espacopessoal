import {
  FIREBASE_ADMIN_CLIENT_EMAIL,
  FIREBASE_ADMIN_PRIVATE_KEY,
} from "../config/env.ts";

export async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const hour = 3600;
  
  const claim = {
    iss: FIREBASE_ADMIN_CLIENT_EMAIL,
    sub: FIREBASE_ADMIN_CLIENT_EMAIL,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + hour,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
  };

  const header = { alg: "RS256", typ: "JWT" };
  const signer = new TextEncoder().encode(FIREBASE_ADMIN_PRIVATE_KEY);
  
  const token = await crypto.subtle.sign(
    { name: "RSASSA-PKCS1-v1_5" },
    signer,
    new TextEncoder().encode(JSON.stringify({ header, claim }))
  );

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: token.toString(),
    }),
  });

  const data = await response.json();
  return data.access_token;
}