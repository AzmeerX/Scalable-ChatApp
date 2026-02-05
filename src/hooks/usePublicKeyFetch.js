import { useCallback } from 'react';
import api from '../api/axiosInstance.js';
import { validatePublicKey, validatePublicKeyForRsa } from '../helpers/cryptoUtils.js';

/**
 * Hook to fetch and cache user public keys
 */
export const usePublicKeyFetch = () => {
    const fetchPublicKey = useCallback(async (userId) => {
        try {
            let response;
            try {
                response = await api.get(
                    `/api/v1/users/public-key/${userId}`
                );
            } catch (primaryErr) {
                response = await api.get(
                    `/api/v1/users/${userId}/public-key`
                );
            }
            const { data } = response;
            const fetchedKey = data.data.publicKey;
            if (!validatePublicKey(fetchedKey) || !(await validatePublicKeyForRsa(fetchedKey))) {
                return null;
            }
            return fetchedKey;
        } catch (error) {
            return null;
        }
    }, []);

    const fetchMultiplePublicKeys = useCallback(
        async (userIds) => {
            const keys = {};
            const fetchPromises = userIds.map(async (userId) => {
                const publicKey = await fetchPublicKey(userId);
                if (publicKey) {
                    keys[userId] = publicKey;
                }
            });
            await Promise.all(fetchPromises);
            return keys;
        },
        [fetchPublicKey]
    );

    return { fetchPublicKey, fetchMultiplePublicKeys };
};
