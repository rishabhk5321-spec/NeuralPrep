
/**
 * Advanced Security Service
 * Handles encryption of local state and environment verification.
 */

const ENCRYPTION_KEY_NAME = 'neural_integrity_v1';

// A simple but effective way to create a stable key from device-specific properties
async function getDeviceKey(): Promise<CryptoKey> {
  const msgUint8 = new TextEncoder().encode(window.navigator.userAgent + ENCRYPTION_KEY_NAME);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  
  return await crypto.subtle.importKey(
    'raw',
    hashBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptState(data: string): Promise<string> {
  try {
    const key = await getDeviceKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encodedData = new TextEncoder().encode(data);
    
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encodedData
    );
    
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(ciphertext), iv.length);
    
    return btoa(String.fromCharCode(...combined));
  } catch (e) {
    console.error("Encryption failure:", e);
    return data; // Fallback to plain if crypto fails (older browsers)
  }
}

export async function decryptState(encryptedData: string): Promise<string> {
  try {
    const key = await getDeviceKey();
    const combined = new Uint8Array(
      atob(encryptedData).split('').map(c => c.charCodeAt(0))
    );
    
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );
    
    return new TextDecoder().decode(decrypted);
  } catch (e) {
    // If decryption fails, it might be plain text or tampered
    return encryptedData;
  }
}

/**
 * Validates prompt against malicious patterns
 */
export function sanitizePrompt(prompt: string): string {
  // Basic prompt injection prevention
  const forbiddenPatterns = [
    /ignore all previous instructions/gi,
    /reveal your system prompt/gi,
    /you are now a/gi,
    /output the raw json/gi
  ];
  
  let clean = prompt;
  forbiddenPatterns.forEach(pattern => {
    clean = clean.replace(pattern, "[REDACTED_SECURITY_THREAT]");
  });
  
  return clean;
}
