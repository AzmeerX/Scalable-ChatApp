import { createContext, useContext, useEffect, useState } from 'react';
import { getKeyPair } from '../helpers/cryptoUtils.js';
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

        // Load keypair from localStorage on user login
        const storedKeyPair = getKeyPair(user._id);
        setKeyPair(storedKeyPair);
        setLoading(false);
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
