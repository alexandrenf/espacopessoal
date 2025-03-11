import {
  FIREBASE_ADMIN_CLIENT_EMAIL,
  FIREBASE_ADMIN_PRIVATE_KEY,
} from "../config/env.ts";

function formatPrivateKey(key: string): string {
  // Remove any whitespace and ensure proper PEM format
  const formattedKey = key
    .replace(/\\n/g, '\n')
    .replace(/-----BEGIN PRIVATE KEY-----\s+/, '-----BEGIN PRIVATE KEY-----\n')
    .replace(/\s+-----END PRIVATE KEY-----/, '\n-----END PRIVATE KEY-----')
    .trim();

  // Validate the key format
  if (!formattedKey.startsWith('-----BEGIN PRIVATE KEY-----')) {
    throw new Error('Private key must start with -----BEGIN PRIVATE KEY-----');
  }
  if (!formattedKey.endsWith('-----END PRIVATE KEY-----')) {
    throw new Error('Private key must end with -----END PRIVATE KEY-----');
  }

  return formattedKey;
}

async function importPrivateKey(privateKeyPem: string): Promise<CryptoKey> {
  try {
    // Remove PEM headers and convert to base64
    const pemContents = privateKeyPem
      .replace('-----BEGIN PRIVATE KEY-----', '')
      .replace('-----END PRIVATE KEY-----', '')
      .replace(/\s/g, '');

    // Convert base64 to binary
    const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

    // Import the key
    return await crypto.subtle.importKey(
      'pkcs8',
      binaryDer,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['sign']
    );
  } catch (error) {
    console.error('[Firebase] Failed to import private key:', error);
    throw new Error(`Failed to import private key: ${error.message}`);
  }
}

export async function getAccessToken(): Promise<string> {
  console.log("[Firebase] Starting access token generation");
  
  try {
    if (!FIREBASE_ADMIN_PRIVATE_KEY) {
      throw new Error('FIREBASE_ADMIN_PRIVATE_KEY is not defined');
    }
    if (!FIREBASE_ADMIN_CLIENT_EMAIL) {
      throw new Error('FIREBASE_ADMIN_CLIENT_EMAIL is not defined');
    }

    const formattedKey = formatPrivateKey(FIREBASE_ADMIN_PRIVATE_KEY);
    console.log("[Firebase] Private key formatted successfully");

    const privateKey = await importPrivateKey(formattedKey);
    console.log("[Firebase] Private key imported successfully");

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
    console.log("[Firebase] JWT generated successfully");

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
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}
