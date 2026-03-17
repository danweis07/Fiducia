/**
 * Vertex AI Shared Utilities
 *
 * Reusable authentication and API calls for Vertex AI (Gemini models).
 * Used across multiple edge functions.
 *
 * Environment Variables Required:
 * - VERTEX_PROJECT_ID: Google Cloud project ID
 * - VERTEX_REGION: Region (default: us-central1)
 * - GOOGLE_SERVICE_ACCOUNT_JSON: Service account credentials JSON
 */

export interface VertexConfig {
  projectId: string;
  region: string;
  credentials: ServiceAccountCredentials;
}

export interface ServiceAccountCredentials {
  client_email: string;
  private_key: string;
  token_uri: string;
}

export interface GeminiMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface GeminiRequest {
  contents: GeminiMessage[];
  generationConfig?: {
    temperature?: number;
    topP?: number;
    topK?: number;
    maxOutputTokens?: number;
    responseMimeType?: string;
  };
}

export interface GeminiResponse {
  candidates: {
    content: {
      parts: { text: string }[];
      role: string;
    };
    finishReason: string;
  }[];
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

/**
 * Get Vertex AI configuration from environment variables
 */
export function getVertexConfig(): VertexConfig | null {
  const projectId = Deno.env.get('VERTEX_PROJECT_ID');
  const region = Deno.env.get('VERTEX_REGION') || 'us-central1';
  const credentialsJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');

  if (!projectId || !credentialsJson) {
    return null;
  }

  try {
    const credentials = JSON.parse(credentialsJson) as ServiceAccountCredentials;
    return { projectId, region, credentials };
  } catch {
    console.error('Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON');
    return null;
  }
}

/**
 * Get Google Cloud access token from service account credentials
 */
export async function getGoogleAccessToken(credentials: ServiceAccountCredentials): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const expiry = now + 3600; // 1 hour

  // Create JWT header and payload
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: credentials.client_email,
    sub: credentials.client_email,
    aud: credentials.token_uri,
    iat: now,
    exp: expiry,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
  };

  // Base64url encode
  const base64url = (obj: object) => {
    const str = JSON.stringify(obj);
    const base64 = btoa(str);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  };

  const headerEncoded = base64url(header);
  const payloadEncoded = base64url(payload);
  const signatureInput = `${headerEncoded}.${payloadEncoded}`;

  // Sign with private key
  const privateKey = credentials.private_key;
  const keyData = privateKey
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\n/g, '');

  const binaryKey = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signatureInput)
  );

  const signature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  const jwt = `${signatureInput}.${signature}`;

  // Exchange JWT for access token
  const tokenResponse = await fetch(credentials.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!tokenResponse.ok) {
    throw new Error(`Failed to get access token: ${await tokenResponse.text()}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

/**
 * Call Gemini model via Vertex AI
 */
export async function callGemini(
  config: VertexConfig,
  prompt: string,
  options?: {
    model?: string;
    temperature?: number;
    maxOutputTokens?: number;
    jsonResponse?: boolean;
  }
): Promise<string> {
  const accessToken = await getGoogleAccessToken(config.credentials);

  const model = options?.model || 'gemini-2.0-flash-001';
  const endpoint = `https://${config.region}-aiplatform.googleapis.com/v1/projects/${config.projectId}/locations/${config.region}/publishers/google/models/${model}:generateContent`;

  const request: GeminiRequest = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: options?.temperature ?? 0.1,
      maxOutputTokens: options?.maxOutputTokens ?? 2048,
      ...(options?.jsonResponse && {
        responseMimeType: 'application/json',
      }),
    },
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Vertex AI (Gemini) error: ${response.status} - ${errorText}`);
  }

  const result = await response.json() as GeminiResponse;

  // Extract text from response
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('No text content in Gemini response');
  }

  return text;
}

/**
 * Call Gemini with structured JSON output
 */
export async function callGeminiJSON<T>(
  config: VertexConfig,
  prompt: string,
  options?: {
    model?: string;
    temperature?: number;
    maxOutputTokens?: number;
  }
): Promise<T> {
  const text = await callGemini(config, prompt, {
    ...options,
    jsonResponse: true,
  });

  // Parse JSON from response
  try {
    // Try to extract JSON if wrapped in markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : text.trim();
    return JSON.parse(jsonStr) as T;
  } catch (err) {
    throw new Error(`Failed to parse Gemini JSON response: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}
