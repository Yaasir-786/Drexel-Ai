// Signup page with full validation for name, email, phone, and password
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import Logo from '../components/Logo';
import TextField from '../components/TextField';
import Button from '../components/Button';

export default function Signup() {
  const navigate = useNavigate();

  // Form field states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  // Inline error states
  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    // Validate Full Name: 2-50 characters
    if (fullName.trim().length < 2 || fullName.trim().length > 50) {
      newErrors.fullName = 'Full name must be between 2 and 50 characters';
    }

    // Validate Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Validate Phone: exactly 10 digits
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length !== 10) {
      newErrors.phone = 'Phone number must be exactly 10 digits';
    }

    // Validate Password: at least 8 characters with at least one letter and one number
    const passwordHasLetter = /[a-zA-Z]/.test(password);
    const passwordHasNumber = /\d/.test(password);
    if (password.length < 8 || !passwordHasLetter || !passwordHasNumber) {
      newErrors.password =
        'Password must be at least 8 characters with a letter and a number';
    }

    setErrors(newErrors);

    // If no errors, advance to onboarding
    if (Object.keys(newErrors).length === 0) {
      navigate('/onboarding');
    }
  };

  return (
    <AuthLayout>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col items-center text-center gap-2">
          <Logo />
          <h1 className="text-2xl font-bold tracking-tight text-ink mt-3">
            Create your account
          </h1>
          <p className="text-sm text-muted">
            Start building AI apps in minutes
          </p>
        </div>

        {/* Signup Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <TextField
            id="fullName"
            label="Full name"
            placeholder="Jane Doe"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              if (errors.fullName) setErrors({ ...errors, fullName: '' });
            }}
            errorText={errors.fullName}
          />

          <TextField
            id="email"
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors({ ...errors, email: '' });
            }}
            errorText={errors.email}
          />

          <TextField
            id="phone"
            label="Phone number"
            type="tel"
            placeholder="9876543210"
            helperText="10 digits"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              if (errors.phone) setErrors({ ...errors, phone: '' });
            }}
            errorText={errors.phone}
          />

          <TextField
            id="password"
            label="Password"
            placeholder="Create a password"
            helperText="Min 8 characters, with a letter and a number"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors({ ...errors, password: '' });
            }}
            showPasswordToggle
            errorText={errors.password}
          />

          <Button type="submit" variant="primary" fullWidth className="mt-2">
            Create account
          </Button>
        </form>

        {/* Link to login */}
        <div className="text-center text-sm text-muted">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-[#0099FF] font-medium hover:underline outline-none"
          >
            Log in
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
