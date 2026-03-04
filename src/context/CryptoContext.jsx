import { createContext, useContext, useEffect, useState } from 'react';
import api from "../api/axiosInstance.js";
import {
    generateKeyPair,
    getKeyPair,
    resolvePublicKeyForUpload,
    storeKeyPair,
    validatePublicKey,
} from '../helpers/cryptoUtils.js';
import { useAuth } from './AuthContext.jsx';

const CryptoContext = createContext();

export const CryptoProvider = ({ children }) => {
    const { user } = useAuth();
    const [keyPair, setKeyPair] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?._id) {
            setKeyPair(null);
            setLoading(false);
            return;
        }

        let cancelled = false;

        const ensureKeyPair = async () => {
            setLoading(true);
            try {
                let storedKeyPair = getKeyPair(user._id);

                if (!storedKeyPair?.privateKey) {
                    const generatedKeyPair = await generateKeyPair();
                    storeKeyPair(user._id, generatedKeyPair);
                    storedKeyPair = generatedKeyPair;
                }

                if (storedKeyPair?.publicKey) {
                    try {
                        const publicKeyForUpload = await resolvePublicKeyForUpload(
                            storedKeyPair.publicKey,
                            storedKeyPair.privateKey
                        );
                        if (validatePublicKey(publicKeyForUpload)) {
                            await api.post('/api/v1/users/upload-public-key', {
                                publicKey: publicKeyForUpload,
                            });
                        }
                    } catch {}
                }

                if (!cancelled) {
                    setKeyPair(storedKeyPair);
                }
            } catch {
                if (!cancelled) {
                    setKeyPair(null);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        ensureKeyPair();

        return () => {
            cancelled = true;
        };
    }, [user?._id]);

    return (
        <CryptoContext.Provider value={{ keyPair, loading }}>
            {children}
        </CryptoContext.Provider>
    );
};

export const useCrypto = () => {
    const context = useContext(CryptoContext);
    if (!context) {
        throw new Error('useCrypto must be used within CryptoProvider');
    }
    return context;
};
