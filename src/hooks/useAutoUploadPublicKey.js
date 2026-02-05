import { useEffect } from 'react';
import api from '../api/axiosInstance.js';
import { getKeyPair, resolvePublicKeyForUpload, validatePublicKey } from '../helpers/cryptoUtils.js';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * Hook to ensure user's public key is uploaded on login
 * Retries if upload failed during signup
 */
export const useAutoUploadPublicKey = () => {
    const { user } = useAuth();

    useEffect(() => {
        if (!user?._id) return;

        const uploadPublicKey = async () => {
            try {
                const keyPair = getKeyPair(user._id);
                
                if (!keyPair?.publicKey) {
                    return;
                }

                const publicKeyForUpload = await resolvePublicKeyForUpload(
                    keyPair.publicKey,
                    keyPair.privateKey
                );
                if (!validatePublicKey(publicKeyForUpload)) {
                    throw new Error('Public key is invalid. Expected PEM with BEGIN PUBLIC KEY.');
                }

                const response = await api.post('/api/v1/users/upload-public-key', {
                    publicKey: publicKeyForUpload,
                });

                return response.data;
            } catch (error) {
                // Upload failed, retry on next login
            }
        };

        uploadPublicKey();
    }, [user?._id]);
};



