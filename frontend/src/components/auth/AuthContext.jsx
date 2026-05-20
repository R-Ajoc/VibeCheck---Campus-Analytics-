import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [business, setBusiness] = useState(null);

  const syncUserFromStorage = () => {
    const storedUser = JSON.parse(localStorage.getItem('user'));
    setUser(storedUser);
    setBusiness(storedUser?.business ?? null);
  };

  useEffect(() => {
    syncUserFromStorage();

    window.addEventListener('login', syncUserFromStorage);
    window.addEventListener('logout', syncUserFromStorage);
    window.addEventListener('storage', syncUserFromStorage);

    return () => {
      window.removeEventListener('login', syncUserFromStorage);
      window.removeEventListener('logout', syncUserFromStorage);
      window.removeEventListener('storage', syncUserFromStorage);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, business, setUser, setBusiness }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);