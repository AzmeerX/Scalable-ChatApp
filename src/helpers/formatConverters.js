export const pemToJwk = async (pemPublicKey) => {
    try {
        const base64 = pemPublicKey
            .replace(/-----BEGIN PUBLIC KEY-----/g, '')
            .replace(/-----END PUBLIC KEY-----/g, '')
            .replace(/-----BEGIN RSA PUBLIC KEY-----/g, '')
            .replace(/-----END RSA PUBLIC KEY-----/g, '')
            .replace(/\n/g, '')
            .replace(/\r/g, '')
            .trim();

        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        const publicKey = await window.crypto.subtle.importKey(
            'spki',
            bytes.buffer,
            {
                name: 'RSASSA-PKCS1-v1_5',
                hash: 'SHA-256',
            },
            true,  // extractable
            ['verify']
        );

        // Export as JWK
        const jwk = await window.crypto.subtle.exportKey('jwk', publicKey);
        return jwk;
    } catch (error) {
        throw new Error(`Failed to convert PEM to JWK: ${error.message}`);
    }
};

export const base64ToJwk = async (base64PublicKey) => {
    try {
        const binaryString = atob(base64PublicKey);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        const publicKey = await window.crypto.subtle.importKey(
            'spki',
            bytes.buffer,
            {
                name: 'RSASSA-PKCS1-v1_5',
                hash: 'SHA-256',
            },
            true,
            ['verify']
        );

        // Export as JWK
        const jwk = await window.crypto.subtle.exportKey('jwk', publicKey);
        return jwk;
    } catch (error) {
        throw new Error(`Failed to convert Base64 to JWK: ${error.message}`);
    }
};

/**
 * Auto-detect and convert public key from any format to JWK
 */
export const autoConvertToJwk = async (publicKeyData) => {
    try {
        if (typeof publicKeyData === 'string') {
            try {
                const parsed = JSON.parse(publicKeyData);
                if (parsed.kty && parsed.e && parsed.n) {
                    return parsed;
                }
            } catch {
                // Not JSON, continue to format detection
            }
        }

        if (publicKeyData.includes('-----BEGIN')) {
            return await pemToJwk(publicKeyData);
        }

        if (/^[A-Za-z0-9+/=\n\r]*$/.test(publicKeyData)) {
            return await base64ToJwk(publicKeyData);
        }

        throw new Error('Unknown public key format. Expected JWK, PEM, or Base64.');
    } catch (error) {
        throw error;
    }
};

export const detectKeyFormat = (keyData) => {
    if (!keyData) return 'empty';
    
    try {
        const parsed = JSON.parse(keyData);
        if (parsed.kty === 'RSA') {
            if (parsed.d) return 'JWK (private)';
            if (parsed.e && parsed.n) return 'JWK (public)';
            return 'JWK (unknown)';
        }
    } catch {
        // Not JSON
    }

    if (keyData.includes('-----BEGIN')) return 'PEM';

    if (/^[A-Za-z0-9+/=\n\r]*$/.test(keyData)) return 'Base64';

    if (/^[0-9a-fA-F]*$/.test(keyData)) return 'Hex';

    return 'Unknown';
};

export default {
    pemToJwk,
    base64ToJwk,
    autoConvertToJwk,
    detectKeyFormat,
};
