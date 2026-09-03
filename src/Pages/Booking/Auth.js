import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BookingLayout from "./BookingLayout";
import { useBooking } from "../../context/BookingContext";
import { signIn, signUp } from "../../api/client";

export default function Auth() {
  const { addressId, spotId } = useParams();
  const navigate = useNavigate();
  const { spot, update } = useBooking();
  const [mode, setMode] = useState("signup"); // 'signup' | 'signin'
  const [method, setMethod] = useState("phone"); // 'phone' | 'email'
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const base = `/r/${addressId}/${spotId}`;

  if (!spot) {
    navigate(`/r/${addressId}`);
    return null;
  }

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Enter your name.");
      return;
    }
    if (!contact.trim()) {
      setError(`Enter your ${method === "phone" ? "phone number" : "email address"}.`);
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      const user = await signUp({ contact, method, password, name });
      update({ user: { ...user, contact, method, name, password } });
      navigate(`${base}/verify`);
    } catch (err) {
      setError(err.message || "Sign up failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError("");
    if (!contact.trim() || !password) {
      setError("Enter your email/phone and password.");
      return;
    }
    setSubmitting(true);
    try {
      const user = await signIn({ contact, method, password });
      update({ user: { ...user, contact, method, password } });
      navigate(user.verified ? `${base}/profile` : `${base}/verify`);
    } catch (err) {
      setError(err.message || "Sign in failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BookingLayout title="Sign In / Sign Up" step={3}>
      <div className="auth-tabs">
        <div
          className={`auth-tab ${mode === "signup" ? "active" : ""}`}
          onClick={() => setMode("signup")}
        >
          Sign Up
        </div>
        <div
          className={`auth-tab ${mode === "signin" ? "active" : ""}`}
          onClick={() => setMode("signin")}
        >
          Sign In
        </div>
      </div>

      <form className="booking-form" onSubmit={mode === "signup" ? handleSignUp : handleSignIn}>
        {mode === "signup" && (
          <div className="booking-field">
            <label htmlFor="name">Full name</label>
            <input
              id="name"
              className="booking-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        )}

        <div className="method-toggle">
          <div
            className={`method-option ${method === "phone" ? "selected" : ""}`}
            onClick={() => setMethod("phone")}
          >
            Phone number
          </div>
          <div
            className={`method-option ${method === "email" ? "selected" : ""}`}
            onClick={() => setMethod("email")}
          >
            Email
          </div>
        </div>

        <div className="booking-field">
          <label htmlFor="contact">{method === "phone" ? "Phone number" : "Email address"}</label>
          <input
            id="contact"
            className="booking-input"
            type={method === "email" ? "email" : "text"}
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder={method === "phone" ? "(555) 555-5555" : ""}
          />
        </div>

        <div className="booking-field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            className="booking-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {mode === "signup" && (
          <div className="booking-field">
            <label htmlFor="confirm-password">Confirm password</label>
            <input
              id="confirm-password"
              className="booking-input"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
        )}

        {error && <p className="error-text">{error}</p>}

        <button className="btn-primary" type="submit" disabled={submitting}>
          {submitting ? "Please wait..." : mode === "signup" ? "Create Account" : "Sign In"}
        </button>
      </form>
    </BookingLayout>
  );
}
