// Login page with email and password fields, validation, and backend auth integration
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import AuthLayout from "../components/AuthLayout";
import Logo from "../components/Logo";
import TextField from "../components/TextField";
import Button from "../components/Button";
import LoaderScreen from "../components/Loader";
import authService from "../services/authService";
import { register } from "../features/auth/authSlice";

export default function Login() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");

  const { mutate, data, isPending, isError, isSuccess, error } = useMutation({
    mutationFn: (payload) => authService.loginUser(payload),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setEmailError("");

    // Simple validation: empty or invalid email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      setEmailError("Email is required");
      return;
    }
    if (!emailRegex.test(email)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    mutate({ email, password });
  };

  useEffect(() => {
    if (data && isSuccess) {
      toast.success("You Have Been LoggedIn..");
      dispatch(register(data));
      navigate(data.onboardingDone ? "/chat" : "/onboarding");
    }
    if (isError && error) {
      toast.error(error.response?.data?.message || "Something went wrong");
    }
  }, [data, isSuccess, isError, error, dispatch, navigate]);

  if (isPending) return <LoaderScreen />;

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
              if (emailError) setEmailError("");
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

          {/* Submit button */}
          <Button type="submit" variant="primary" fullWidth className="mt-2">
            Log in
          </Button>
        </form>

        {/* Link to signup */}
        <div className="text-center text-sm text-muted">
          New here?{" "}
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
