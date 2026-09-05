/**
 * High-Security Cryptographic Utilities for Biometric Embeddings & Legal Consent Releases
 * Uses standard Web Crypto API (SubtleCrypto)
 */

export async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Derive a 256-bit AES-GCM Key using PBKDF2 from a master secret
async function getAesKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const salt = encoder.encode('the-workshop-biometric-salt-v2');
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a mathematical face embedding vector (e.g. 128-d or 512-d Float32)
 * Storing raw photos is NEVER allowed per Section 2.1
 */
export async function encryptEmbedding(
  embedding: number[],
  secretKey: string = 'the-workshop-default-local-master-key'
): Promise<{ cipherBase64: string; ivBase64: string }> {
  const key = await getAesKey(secretKey);
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for AES-GCM
  const jsonString = JSON.stringify(embedding);
  const encodedData = new TextEncoder().encode(jsonString);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encodedData
  );

  return {
    cipherBase64: arrayBufferToBase64(ciphertext),
    ivBase64: arrayBufferToBase64(iv.buffer),
  };
}

/**
 * Decrypts embedding in memory for vector distance matching
 */
export async function decryptEmbedding(
  cipherBase64: string,
  ivBase64: string,
  secretKey: string = 'the-workshop-default-local-master-key'
): Promise<number[]> {
  const key = await getAesKey(secretKey);
  const iv = new Uint8Array(base64ToArrayBuffer(ivBase64));
  const ciphertext = base64ToArrayBuffer(cipherBase64);

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );

  const decodedJson = new TextDecoder().decode(decryptedBuffer);
  return JSON.parse(decodedJson);
}

/**
 * Compute Cosine Similarity between two face embeddings
 * Returns value between -1.0 and 1.0 (typically > 0.85 indicates a face match)
 */
export function computeCosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}
