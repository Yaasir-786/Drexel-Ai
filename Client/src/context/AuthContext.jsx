// Auth context managing user identity and role-based access control
import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

const DEFAULT_USER = {
  id: 'u2',
  name: 'Jane Doe',
  email: 'jane@example.com',
  initials: 'JD',
  role: 'USER',
  credits: '178.6',
};

const ADMIN_USER = {
  id: 'u1',
  name: 'Alex Rivera (Admin)',
  email: 'admin@example.com',
  initials: 'AR',
  role: 'ADMIN',
  credits: '340.5',
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('drexel_user');
      return saved ? JSON.parse(saved) : DEFAULT_USER;
    } catch {
      return DEFAULT_USER;
    }
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('drexel_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('drexel_user');
    }
  }, [user]);

  const login = (email, password) => {
    const isEmailAdmin =
      email.toLowerCase().includes('admin') ||
      email.toLowerCase() === 'alex@example.com' ||
      email.toLowerCase() === 'elena@example.com';

    let loggedInUser;
    if (isEmailAdmin) {
      loggedInUser = {
        ...ADMIN_USER,
        email: email.trim(),
      };
    } else {
      const namePart = email.split('@')[0] || 'User';
      const formattedName =
        namePart.charAt(0).toUpperCase() + namePart.slice(1);
      loggedInUser = {
        id: 'u_' + Date.now(),
        name: email === 'jane@example.com' ? 'Jane Doe' : formattedName,
        email: email.trim(),
        initials: (formattedName[0] || 'U') + (formattedName[1] || '').toUpperCase(),
        role: 'USER',
        credits: '178.6',
      };
    }

    setUser(loggedInUser);
    return loggedInUser;
  };

  const signup = (userData) => {
    const name = userData.fullName || 'User';
    const initials = name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    const newUser = {
      id: 'u_' + Date.now(),
      name,
      email: userData.email,
      initials: initials || 'U',
      role: 'USER',
      credits: '100.0',
    };

    setUser(newUser);
    return newUser;
  };

  const logout = () => {
    // Reset to demo regular user or null
    setUser(null);
    localStorage.removeItem('drexel_user');
  };

  const switchRole = (newRole) => {
    if (newRole === 'ADMIN') {
      setUser(ADMIN_USER);
    } else {
      setUser(DEFAULT_USER);
    }
  };

  const isAdmin = user?.role === 'ADMIN';

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        login,
        signup,
        logout,
        switchRole,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
