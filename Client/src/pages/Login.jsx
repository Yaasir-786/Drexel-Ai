// Login page with email and password fields, validation, and login error banner
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import Logo from '../components/Logo';
import TextField from '../components/TextField';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');

  // loginError state: empty by default; backend will fill it later
  const [loginError, setLoginError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setEmailError('');

    // Simple validation: empty or invalid email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      setEmailError('Email is required');
      return;
    }
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    // Authenticate and navigate to Claude-inspired chat interface
    login(email, password);
    navigate('/chat');
  };

  return (
    <AuthLayout>
      <div className="flex flex-col gap-6">
        {/* Top: Logo and Header */}
        <div className="flex flex-col items-center text-center gap-2">
          <Logo />
          <h1 className="text-2xl font-bold tracking-tight text-ink mt-3">
            Welcome back
          </h1>
          <p className="text-sm text-muted">
            Log in to continue building
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <TextField
            id="email"
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError) setEmailError('');
            }}
            errorText={emailError}
          />

          <TextField
            id="password"
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            showPasswordToggle
          />

          {/* Red banner for server error if present */}
          {loginError && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-medium dark:bg-red-950/40 dark:border-red-900 dark:text-red-400"
            >
              {loginError}
            </div>
          )}

          {/* Submit button */}
          <Button type="submit" variant="primary" fullWidth className="mt-2">
            Log in
          </Button>

          {/* Quick role hint */}
          <p className="text-[11px] text-center text-muted mt-1">
            Tip: Log in with <code className="text-ink">jane@example.com</code> for User or <code className="text-[#0099FF]">admin@example.com</code> for Admin
          </p>
        </form>

        {/* Link to signup */}
        <div className="text-center text-sm text-muted">
          New here?{' '}
          <Link
            to="/signup"
            className="text-[#0099FF] font-medium hover:underline outline-none"
          >
            Sign up
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
