import cryptoRandomString from 'crypto-random-string';
import crypto from 'crypto';

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
    authUrl: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}/oauth2/v2.0/authorize?` +
      `client_id=${process.env.MICROSOFT_CLIENT_ID}` +
      `&response_type=code` +
      `&redirect_uri=${encodeURIComponent(`${process.env.APP_URL || 'http://localhost:5000'}/api/auth/microsoft/callback`)}` +
      `&response_mode=query` +
      `&scope=${encodeURIComponent('openid profile email User.Read')}` +
      `&state=${state}` +
      `&nonce=${nonce}` +
      `&code_challenge=${codeChallenge}` +
      `&code_challenge_method=S256`,
    codeVerifier,
  };
}

export async function exchangeCodeForTokens(code: string, codeVerifier: string) {
  const tokenUrl = `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}/oauth2/v2.0/token`;
  
  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID!,
    client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
    code,
    redirect_uri: `${process.env.APP_URL || 'http://localhost:5000'}/api/auth/microsoft/callback`,
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
