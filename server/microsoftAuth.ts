import cryptoRandomString from 'crypto-random-string';
import crypto from 'crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const REDIRECT_URI = process.env.APP_URL 
  ? `${process.env.APP_URL}/api/auth/callback/azure-ad`
  : 'https://rock-control-web-app-danthomson10.replit.app/api/auth/callback/azure-ad';

const TENANT_ID = process.env.MICROSOFT_TENANT_ID!;
const CLIENT_ID = process.env.MICROSOFT_CLIENT_ID!;

// Create JWKSet for Microsoft's public keys
const JWKS = createRemoteJWKSet(
  new URL(`https://login.microsoftonline.com/${TENANT_ID}/discovery/v2.0/keys`)
);

function base64URLEncode(buffer: Buffer): string {
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function sha256(buffer: string): Buffer {
  return crypto.createHash('sha256').update(buffer).digest();
}

export function generateAuthUrl(state: string, nonce: string) {
  const codeVerifier = cryptoRandomString({ length: 64, type: 'url-safe' });
  const codeChallenge = base64URLEncode(sha256(codeVerifier));

  return {
    authUrl: `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/authorize?` +
      `client_id=${CLIENT_ID}` +
      `&response_type=code` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&response_mode=query` +
      `&scope=${encodeURIComponent('openid profile email User.Read')}` +
      `&state=${state}` +
      `&nonce=${nonce}` +
      `&code_challenge=${codeChallenge}` +
      `&code_challenge_method=S256`,
    codeVerifier,
    state,
    nonce,
  };
}

export async function exchangeCodeForTokens(code: string, codeVerifier: string) {
  const tokenUrl = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;
  
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
    code,
    redirect_uri: REDIRECT_URI,
    grant_type: 'authorization_code',
    code_verifier: codeVerifier,
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  return response.json();
}

export async function validateIdToken(idToken: string, expectedNonce: string): Promise<any> {
  // Verify JWT signature using Microsoft's public JWKS
  // This will throw if signature, issuer, audience, or expiration are invalid
  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer: `https://login.microsoftonline.com/${TENANT_ID}/v2.0`,
    audience: CLIENT_ID,
  });
  
  // Validate nonce to prevent replay attacks
  if (payload.nonce !== expectedNonce) {
    throw new Error('Nonce mismatch - potential replay attack');
  }
  
  // Ensure required claims are present
  if (!payload.sub || !payload.email) {
    throw new Error('Missing required claims in ID token');
  }
  
  return payload;
}

export async function getUserInfo(accessToken: string) {
  const response = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch user info from Microsoft Graph');
  }

  return response.json();
}
