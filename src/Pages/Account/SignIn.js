import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../images/logo.png";
import { useAuth } from "../../context/AuthContext";
import { signIn, signUp, verifyCode, resendCode, ensureToken, IS_MOCK } from "../../api/client";
import "../Booking/booking.css";
import "./account.css";

const CODE_LENGTH = 4;

// Formats raw digits as (555) 234-9944 for display. The underlying state
// stays plain digits — that's what actually gets sent to the backend.
function formatPhoneDisplay(digits) {
  const d = digits.slice(0, 10);
  if (d.length === 0) return "";
  if (d.length < 4) return `(${d}`;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

// Standalone sign-in/sign-up entry point, reached from the header — not
// part of the booking wizard. On success it persists the session (see
// AuthContext) so the site remembers the visitor everywhere, including
// when they later start a rental.
export default function SignIn() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [mode, setMode] = useState("signup");
  const [method, setMethod] = useState("phone");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Set once sign-up succeeds and an OTP has been sent — switches the
  // form over to code entry.
  const [pendingUser, setPendingUser] = useState(null);
  const [digits, setDigits] = useState(Array(CODE_LENGTH).fill(""));
  const [resent, setResent] = useState(false);

  const finishLogin = (user) => {
    login({ userId: user.userId, token: user.token, contact: user.contact, method: user.method, name: user.name });
    navigate("/");
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) return setError("Enter your name.");
    if (!contact.trim()) return setError(`Enter your ${method === "phone" ? "phone number" : "email address"}.`);
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirmPassword) return setError("Passwords don't match.");
    setSubmitting(true);
    try {
      const user = await signUp({ contact, method, password, name });
      setPendingUser({ ...user, contact, method, name, password });
    } catch (err) {
      setError(err.message || "Sign up failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError("");
    if (!contact.trim() || !password) return setError("Enter your email/phone and password.");
    setSubmitting(true);
    try {
      const user = await signIn({ contact, method, password });
      if (user.verified) {
        finishLogin(user);
      } else {
        setPendingUser({ ...user, contact, method, password });
      }
    } catch (err) {
      setError(err.message || "Sign in failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async () => {
    const code = digits.join("");
    if (code.length !== CODE_LENGTH) return setError(`Enter the ${CODE_LENGTH}-digit code.`);
    setSubmitting(true);
    setError("");
    try {
      const result = await verifyCode({ userId: pendingUser.userId, type: pendingUser.method, code });
      if (!result.verified) {
        setError("That code didn't work. Try again.");
        return;
      }
      const token = await ensureToken(pendingUser);
      finishLogin({ ...pendingUser, token });
    } catch (err) {
      setError(err.message || "Verification failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    try {
      await resendCode({ userId: pendingUser.userId, type: pendingUser.method });
      setResent(true);
      setTimeout(() => setResent(false), 3000);
    } catch (err) {
      setError(err.message || "Couldn't resend the code.");
    }
  };

  return (
    <div className="booking-page">
      <div className="booking-header">
        <button className="booking-back" aria-label="Back" onClick={() => navigate("/")}>
          ←
        </button>
        <img className="booking-logo" src={logo} alt="PRK'n" />
        <h1 className="booking-header-title">{pendingUser ? "Verify It's You" : "Sign In / Sign Up"}</h1>
      </div>
      <div className="booking-content">
        {pendingUser ? (
          <>
            <p className="help-text">
              We sent a {CODE_LENGTH}-digit code to your {pendingUser.method === "email" ? "email" : "phone"} (
              {pendingUser.contact}).
              {IS_MOCK && (
                <>
                  {" "}
                  <span className="stub-badge">Demo</span> — enter any {CODE_LENGTH} digits to continue.
                </>
              )}
            </p>
            <div className="code-input-row">
              {digits.map((d, i) => (
                <input
                  key={i}
                  className="code-box"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={(e) => {
                    if (!/^\d?$/.test(e.target.value)) return;
                    const next = [...digits];
                    next[i] = e.target.value;
                    setDigits(next);
                  }}
                />
              ))}
            </div>
            {error && <p className="error-text">{error}</p>}
            <button className="btn-primary" onClick={handleVerify} disabled={submitting}>
              {submitting ? "Verifying..." : "Verify"}
            </button>
            <button className="resend-link" style={{ marginTop: 16 }} onClick={handleResend}>
              {resent ? "Code resent" : "Resend code"}
            </button>
          </>
        ) : (
          <>
            <div className="auth-tabs">
              <div className={`auth-tab ${mode === "signup" ? "active" : ""}`} onClick={() => setMode("signup")}>
                Sign Up
              </div>
              <div className={`auth-tab ${mode === "signin" ? "active" : ""}`} onClick={() => setMode("signin")}>
                Sign In
              </div>
            </div>
            <form className="booking-form" onSubmit={mode === "signup" ? handleSignUp : handleSignIn}>
              {mode === "signup" && (
                <div className="booking-field">
                  <label htmlFor="name">Full name</label>
                  <input id="name" className="booking-input" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
              )}
              <div className="method-toggle">
                <div className={`method-option ${method === "phone" ? "selected" : ""}`} onClick={() => setMethod("phone")}>
                  Phone number
                </div>
                <div className={`method-option ${method === "email" ? "selected" : ""}`} onClick={() => setMethod("email")}>
                  Email
                </div>
              </div>
              <div className="booking-field">
                <label htmlFor="contact">{method === "phone" ? "Phone number" : "Email address"}</label>
                <input
                  id="contact"
                  className="booking-input"
                  type={method === "email" ? "email" : "text"}
                  inputMode={method === "phone" ? "numeric" : undefined}
                  value={method === "phone" ? formatPhoneDisplay(contact) : contact}
                  onChange={(e) =>
                    setContact(method === "phone" ? e.target.value.replace(/\D/g, "").slice(0, 10) : e.target.value)
                  }
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
              <button className="btn-accent" type="submit" disabled={submitting}>
                {submitting ? "Please wait..." : mode === "signup" ? "Create Account" : "Sign In"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
