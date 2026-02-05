/*
 Helper function to check if a string is valid JSON
 */
const isValidJSON = (str) => {
    try {
        JSON.parse(str);
        return true;
    } catch {
        return false;
    }
};

const PEM_PUBLIC_KEY_HEADER = "-----BEGIN PUBLIC KEY-----";
const PEM_PUBLIC_KEY_FOOTER = "-----END PUBLIC KEY-----";

const isPemPublicKey = (pem) =>
    typeof pem === "string" &&
    pem.includes(PEM_PUBLIC_KEY_HEADER) &&
    pem.includes(PEM_PUBLIC_KEY_FOOTER);

const base64ToStringSafe = (value) => {
    try {
        return atob(value);
    } catch {
        return null;
    }
};

const arrayBufferToBase64 = (buffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i += 1) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
};

const base64ToArrayBuffer = (base64) => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
};

const spkiToPem = (spkiBuffer) => {
    const base64 = arrayBufferToBase64(spkiBuffer);
    const lines = base64.match(/.{1,64}/g) || [];
    return `${PEM_PUBLIC_KEY_HEADER}\n${lines.join("\n")}\n${PEM_PUBLIC_KEY_FOOTER}`;
};

const pemToSpki = (pem) => {
    const base64 = pem
        .replace(PEM_PUBLIC_KEY_HEADER, "")
        .replace(PEM_PUBLIC_KEY_FOOTER, "")
        .replace(/\s+/g, "");
    return base64ToArrayBuffer(base64);
};

const pkcs7Pad = (data, blockSize = 16) => {
    const padLen = blockSize - (data.length % blockSize || blockSize);
    const padded = new Uint8Array(data.length + padLen);
    padded.set(data, 0);
    padded.fill(padLen, data.length);
    return padded;
};

const pkcs7Unpad = (data, blockSize = 16) => {
    if (data.length === 0 || data.length % blockSize !== 0) {
        throw new Error("Invalid padded data length");
    }
    const padLen = data[data.length - 1];
    if (padLen < 1 || padLen > blockSize) {
        throw new Error("Invalid padding");
    }
    for (let i = data.length - padLen; i < data.length; i += 1) {
        if (data[i] !== padLen) {
            throw new Error("Invalid padding");
        }
    }
    return data.slice(0, data.length - padLen);
};

/**
 * Normalize public key format:
 * - Base64-encoded PEM (backend format)
 * - Raw PEM (for local conversion)
 */
const normalizePublicKey = (keyData) => {
    if (!keyData || typeof keyData !== "string") {
        throw new Error("Key data is empty");
    }

    // Raw PEM string
    if (isPemPublicKey(keyData)) {
        return { spki: pemToSpki(keyData), raw: keyData };
    }

    // Base64-encoded PEM string
    const decoded = base64ToStringSafe(keyData);
    if (decoded && isPemPublicKey(decoded)) {
        return { spki: pemToSpki(decoded), raw: decoded };
    }

    throw new Error(
        `Public key is in unrecognized format. Expected Base64-encoded PEM (RSA). Received: ${keyData.substring(0, 50)}...`
    );
};
const normalizePrivateKey = (keyData) => {
    if (!keyData) throw new Error("Key data is empty");
    
    // If it's valid JSON, parse it
    if (isValidJSON(keyData)) {
        try {
            const parsed = JSON.parse(keyData);
            // Check if it looks like a JWK
            if (parsed.kty && parsed.d && parsed.n) {
                return parsed;
            }
        } catch (err) {
            // Ignore parse errors
        }
    }
    
    // If we get here, it's malformed
    throw new Error(`Private key is in unrecognized format. Expected JWK format.`);
};

/*
  Generates RSA-2048 keypair using Web Crypto API
  Public key is Base64-encoded PEM; private key stays local as JWK
 */
export const generateKeyPair = async () => {
    try {
        const keyPair = await window.crypto.subtle.generateKey(
            {
                name: "RSASSA-PKCS1-v1_5",
                modulusLength: 2048,
                publicExponent: new Uint8Array([1, 0, 1]),
                hash: "SHA-256",
            },
            true, // extractable
            ["sign", "verify"]
        );

        // Export public key to SPKI (PEM) for backend compatibility
        const publicKeySpki = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
        const publicKeyPem = spkiToPem(publicKeySpki);
        const publicKeyPemBase64 = btoa(publicKeyPem);

        // Export private key to JWK for local storage
        const privateKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);

        return {
            publicKey: publicKeyPemBase64,
            privateKey: JSON.stringify(privateKeyJwk),
        };
    } catch (error) {
        throw new Error("Keypair generation failed");
    }
};

export const encryptMessage = async (plaintext, recipientPublicKeyPemBase64, senderPrivateKeyJwk) => {
    try {
        // Normalize and parse keys
        let senderPrivKeyObj;

        try {
            normalizePublicKey(recipientPublicKeyPemBase64);
        } catch (err) {
            throw err;
        }

        try {
            senderPrivKeyObj = normalizePrivateKey(senderPrivateKeyJwk);
        } catch (err) {
            throw err;
        }

        // Generate random IV for AES-CBC
        const iv = window.crypto.getRandomValues(new Uint8Array(16));

        // Derive AES key from both public keys (deterministic for sender/recipient)
        const senderPublicKeyPemBase64 = await deriveBase64PemPublicKeyFromPrivateKey(
            senderPrivateKeyJwk
        );
        const keySeed = [recipientPublicKeyPemBase64, senderPublicKeyPemBase64]
            .sort()
            .join("|");
        const keyMaterial = await window.crypto.subtle.importKey(
            "raw",
            new TextEncoder().encode(keySeed),
            "HKDF",
            false,
            ["deriveBits"]
        );
        const derivedKey = await window.crypto.subtle.deriveBits(
            {
                name: "HKDF",
                hash: "SHA-256",
                salt: new Uint8Array(16),
                info: new TextEncoder().encode("AES-256-CBC"),
            },
            keyMaterial,
            256
        );
        const aesKey = await window.crypto.subtle.importKey(
            "raw",
            derivedKey,
            { name: "AES-CBC" },
            false,
            ["encrypt"]
        );

        // Encrypt message with AES-CBC (PKCS#7 padding)
        const plaintextBytes = new TextEncoder().encode(plaintext);
        const paddedPlaintext = pkcs7Pad(plaintextBytes);
        const encryptedContent = await window.crypto.subtle.encrypt(
            { name: "AES-CBC", iv: iv },
            aesKey,
            paddedPlaintext
        );

        // Convert encrypted content to base64
        const encryptedBase64 = btoa(String.fromCharCode(...new Uint8Array(encryptedContent)));

        // Import private key from JWK
        const privateKey = await window.crypto.subtle.importKey(
            "jwk",
            senderPrivKeyObj,
            {
                name: "RSASSA-PKCS1-v1_5",
                hash: "SHA-256",
            },
            false,
            ["sign"]
        );

        // Sign the encrypted content with RSA-SHA256
        const signature = await window.crypto.subtle.sign(
            "RSASSA-PKCS1-v1_5",
            privateKey,
            new TextEncoder().encode(encryptedBase64)
        );

        return {
            encryptedText: encryptedBase64,
            iv: btoa(String.fromCharCode(...iv)),
            signature: btoa(String.fromCharCode(...new Uint8Array(signature))),
            algorithm: "AES-256-CBC",
        };
    } catch (error) {
        throw error;
    }
};
export const decryptMessage = async (encryptedPayload, senderPublicKeyPemBase64, myPrivateKeyJwk) => {
    try {
        // Normalize and parse keys
        let senderPubKeyObj, myPrivKeyObj;

        try {
            senderPubKeyObj = normalizePublicKey(senderPublicKeyPemBase64);
        } catch (err) {
            throw err;
        }

        try {
            myPrivKeyObj = normalizePrivateKey(myPrivateKeyJwk);
        } catch (err) {
            throw err;
        }

        // Import sender's public key from SPKI
        const senderPublicKey = await window.crypto.subtle.importKey(
            "spki",
            senderPubKeyObj.spki,
            {
                name: "RSASSA-PKCS1-v1_5",
                hash: "SHA-256",
            },
            false,
            ["verify"]
        );

        // Convert signature from base64
        const signatureBytes = Uint8Array.from(atob(encryptedPayload.signature), c => c.charCodeAt(0));

        // Verify RSA-SHA256 signature
        const isSignatureValid = await window.crypto.subtle.verify(
            "RSASSA-PKCS1-v1_5",
            senderPublicKey,
            signatureBytes,
            new TextEncoder().encode(encryptedPayload.encryptedText)
        );

        if (!isSignatureValid) {
            throw new Error("Signature verification failed - message may have been tampered");
        }

        // Convert base64 values back
        const encryptedContent = Uint8Array.from(atob(encryptedPayload.encryptedText), c => c.charCodeAt(0));
        const iv = Uint8Array.from(atob(encryptedPayload.iv), c => c.charCodeAt(0));

        // Derive AES key from both public keys (deterministic for sender/recipient)
        const myPublicKeyPemBase64 = await deriveBase64PemPublicKeyFromPrivateKey(
            myPrivateKeyJwk
        );
        const keySeed = [senderPublicKeyPemBase64, myPublicKeyPemBase64]
            .sort()
            .join("|");
        const keyMaterial = await window.crypto.subtle.importKey(
            "raw",
            new TextEncoder().encode(keySeed),
            "HKDF",
            false,
            ["deriveBits"]
        );

        const derivedKey = await window.crypto.subtle.deriveBits(
            {
                name: "HKDF",
                hash: "SHA-256",
                salt: new Uint8Array(16),
                info: new TextEncoder().encode("AES-256-CBC"),
            },
            keyMaterial,
            256
        );

        const aesKey = await window.crypto.subtle.importKey(
            "raw",
            derivedKey,
            { name: "AES-CBC" },
            false,
            ["decrypt"]
        );

        // Decrypt message (PKCS#7 unpadding)
        const decryptedContent = await window.crypto.subtle.decrypt(
            { name: "AES-CBC", iv: iv },
            aesKey,
            encryptedContent
        );

        const unpadded = pkcs7Unpad(new Uint8Array(decryptedContent));
        return new TextDecoder().decode(unpadded);
    } catch (error) {
        throw error;
    }
};
export const storeKeyPair = (userId, keyPair) => {
    try {
        const keyData = {
            userId,
            ...keyPair,
            createdAt: new Date().toISOString(),
        };
        localStorage.setItem(`crypto_keys_${userId}`, JSON.stringify(keyData));
    } catch (error) {
        throw new Error('Failed to store keypair');
    }
};

/**
 * Retrieve keypair from localStorage
 */
export const getKeyPair = (userId) => {
    try {
        const keyData = localStorage.getItem(`crypto_keys_${userId}`);
        if (!keyData) {
            // Fallback: scan for a stored keypair matching the userId
            for (let i = 0; i < localStorage.length; i += 1) {
                const keyName = localStorage.key(i);
                if (!keyName || !keyName.startsWith("crypto_keys_")) continue;
                try {
                    const parsed = JSON.parse(localStorage.getItem(keyName));
                    if (parsed?.userId === userId) {
                        return {
                            publicKey: parsed.publicKey,
                            privateKey: parsed.privateKey,
                        };
                    }
                } catch {
                    // ignore malformed entries
                }
            }
            return null;
        }
        const parsed = JSON.parse(keyData);
        return {
            publicKey: parsed.publicKey,
            privateKey: parsed.privateKey,
        };
    } catch (error) {
        return null;
    }
};

/**
 * Clear keypair from localStorage (logout)
 */
export const clearKeyPair = (userId) => {
    try {
        localStorage.removeItem(`crypto_keys_${userId}`);
    } catch (error) {
        // Ignore clear errors
    }
};

/**
 * Validate private key is valid JWK format
 */
export const validatePrivateKey = (privateKey) => {
    try {
        if (!privateKey || typeof privateKey !== 'string') return false;
        const parsed = JSON.parse(privateKey);
        return parsed.d && parsed.n; // RSA private key has 'd' and 'n' components
    } catch {
        return false;
    }
};

/**
 * Validate public key is Base64-encoded PEM (or raw PEM)
 */
export const validatePublicKey = (publicKey) => {
    try {
        if (!publicKey || typeof publicKey !== "string") return false;
        if (isPemPublicKey(publicKey)) return true;
        const decoded = base64ToStringSafe(publicKey);
        return Boolean(decoded && isPemPublicKey(decoded));
    } catch {
        return false;
    }
};

/**
 * Validate public key is RSA and importable by WebCrypto.
 */
export const validatePublicKeyForRsa = async (publicKey) => {
    try {
        const normalized = normalizePublicKey(publicKey);
        await window.crypto.subtle.importKey(
            "spki",
            normalized.spki,
            {
                name: "RSASSA-PKCS1-v1_5",
                hash: "SHA-256",
            },
            false,
            ["verify"]
        );
        return true;
    } catch {
        return false;
    }
};

/**
 * Ensure public key is Base64-encoded PEM for backend upload.
 * Accepts Base64-PEM, PEM, or a real JWK and converts as needed.
 */
export const ensureBase64PemPublicKey = async (publicKey) => {
    if (!publicKey || typeof publicKey !== "string") {
        throw new Error("Public key is empty");
    }

    if (isPemPublicKey(publicKey)) {
        return btoa(publicKey);
    }

    const decoded = base64ToStringSafe(publicKey);
    if (decoded && isPemPublicKey(decoded)) {
        return btoa(decoded);
    }

    if (isValidJSON(publicKey)) {
        const parsed = JSON.parse(publicKey);
        if (parsed.kty && parsed.e && parsed.n) {
            const cryptoKey = await window.crypto.subtle.importKey(
                "jwk",
                parsed,
                {
                    name: "RSASSA-PKCS1-v1_5",
                    hash: "SHA-256",
                },
                true,
                ["verify"]
            );
            const spki = await window.crypto.subtle.exportKey("spki", cryptoKey);
            const pem = spkiToPem(spki);
            return btoa(pem);
        }
    }

    throw new Error("Public key is in unrecognized format. Expected PEM with BEGIN PUBLIC KEY.");
};

/**
 * Derive Base64-encoded PEM public key from a private JWK.
 */
export const deriveBase64PemPublicKeyFromPrivateKey = async (privateKeyJwk) => {
    if (!privateKeyJwk || typeof privateKeyJwk !== "string") {
        throw new Error("Private key is empty");
    }

    if (!isValidJSON(privateKeyJwk)) {
        throw new Error("Private key is in unrecognized format.");
    }

    const parsed = JSON.parse(privateKeyJwk);
    if (!parsed.kty || !parsed.n || !parsed.e) {
        throw new Error("Private key is missing RSA parameters.");
    }

    const publicJwk = {
        kty: parsed.kty,
        n: parsed.n,
        e: parsed.e,
        alg: "RS256",
        ext: true,
        key_ops: ["verify"],
    };

    const cryptoKey = await window.crypto.subtle.importKey(
        "jwk",
        publicJwk,
        {
            name: "RSASSA-PKCS1-v1_5",
            hash: "SHA-256",
        },
        true,
        ["verify"]
    );

    const spki = await window.crypto.subtle.exportKey("spki", cryptoKey);
    const pem = spkiToPem(spki);
    return btoa(pem);
};

/**
 * Ensure we have a valid Base64-encoded PEM public key for upload.
 * Falls back to deriving from private JWK if needed.
 */
export const resolvePublicKeyForUpload = async (publicKey, privateKeyJwk) => {
    try {
        return await ensureBase64PemPublicKey(publicKey);
    } catch (error) {
        if (privateKeyJwk) {
            return await deriveBase64PemPublicKeyFromPrivateKey(privateKeyJwk);
        }
        throw error;
    }
};













