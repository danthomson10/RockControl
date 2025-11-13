import { Issuer, generators, type BaseClient } from 'openid-client';

let microsoftClient: BaseClient | null = null;

export async function getMicrosoftClient() {
  if (microsoftClient) {
    return microsoftClient;
  }

  const microsoftIssuer = await Issuer.discover(
    `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}/v2.0`
  );

  microsoftClient = new microsoftIssuer.Client({
    client_id: process.env.MICROSOFT_CLIENT_ID!,
    client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
    redirect_uris: [`${process.env.APP_URL || 'http://localhost:5000'}/api/auth/microsoft/callback`],
    response_types: ['code'],
  });

  return microsoftClient;
}

export function generateAuthUrl(state: string, nonce: string) {
  const codeVerifier = generators.codeVerifier();
  const codeChallenge = generators.codeChallenge(codeVerifier);

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
  const client = await getMicrosoftClient();
  
  const tokenSet = await client.callback(
    `${process.env.APP_URL || 'http://localhost:5000'}/api/auth/microsoft/callback`,
    { code },
    { code_verifier: codeVerifier }
  );

  return tokenSet;
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
