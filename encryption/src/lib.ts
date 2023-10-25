const arrayBufferToBase64 = (bytes: Uint8Array) => {
  return btoa(String.fromCharCode.apply(null, bytes as unknown as number[]));
};

const base64ToArrayBuffer = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

export interface EncryptedData {
  iv: string;
  salt: string;
  cipherText: string;
}

export interface EncryptionKey {
  key: CryptoKey;
  salt: Uint8Array;
}

export const generateKey = async (
  secret: string,
  opts?: { saltAsBase64?: string }
): Promise<EncryptionKey> => {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const salt = opts?.saltAsBase64
    ? base64ToArrayBuffer(opts.saltAsBase64)
    : crypto.getRandomValues(new Uint8Array(64 / 2));
  return {
    salt,
    key: await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100_000,
        hash: 'SHA-256',
      },
      material,
      {
        name: 'AES-GCM',
        length: 256,
      },
      false,
      ['encrypt', 'decrypt']
    ),
  };
};

export const encrypt = async (
  data: string,
  // could accept union with secret
  opts: { key: CryptoKey; salt: Uint8Array }
): Promise<EncryptedData> => {
  const iv = crypto.getRandomValues(new Uint8Array(32 / 2));
  const cipherText = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    opts.key,
    new TextEncoder().encode(data)
  );

  return {
    iv: arrayBufferToBase64(iv),
    salt: arrayBufferToBase64(opts.salt),
    cipherText: arrayBufferToBase64(new Uint8Array(cipherText)),
  };
};

export const decrypt = async (
  data: EncryptedData,
  opts: {
    key: CryptoKey;
  }
): Promise<string> => {
  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: base64ToArrayBuffer(data.iv),
    },
    opts.key,
    base64ToArrayBuffer(data.cipherText)
  );
  return new TextDecoder().decode(decrypted);
};
