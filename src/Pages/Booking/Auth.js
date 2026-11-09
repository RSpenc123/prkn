import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BookingLayout from "./BookingLayout";
import { useBooking } from "../../context/BookingContext";
import { useAuth } from "../../context/AuthContext";
import { signIn, signUp, verifyCode, resendCode, forgotPassword, resetPassword, IS_MOCK } from "../../api/client";
import PasswordField, { isValidPassword, PASSWORD_REQUIREMENTS_TEXT } from "../../components/PasswordField";

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

export default function Auth() {
  const { addressId, spotId } = useParams();
  const navigate = useNavigate();
  const { spot, update } = useBooking();
  const { isSignedIn, login } = useAuth();
  const [mode, setMode] = useState("signup"); // 'signup' | 'signin'
  const [method, setMethod] = useState("phone"); // 'phone' | 'email'
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // "Forgot password?" is a separate, self-contained flow (contact -> code
  // -> new password) that replaces the sign-in/sign-up form while active,
  // mirroring the standalone version on the Account sign-in page.
  const [showForgot, setShowForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState("contact"); // "contact" | "otp" | "newPassword"
  const [forgotMethod, setForgotMethod] = useState("phone");
  const [forgotContact, setForgotContact] = useState("");
  const [forgotUserId, setForgotUserId] = useState(null);
  const [forgotToken, setForgotToken] = useState(null);
  const [forgotName, setForgotName] = useState(null);
  const [forgotDigits, setForgotDigits] = useState(Array(CODE_LENGTH).fill(""));
  const [forgotResent, setForgotResent] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const base = `/r/${addressId}/${spotId}`;

  if (!spot) {
    navigate(`/r/${addressId}`);
    return null;
  }

  // Already signed in (e.g. reached this URL directly, such as via the
  // back button) — nothing to ask, go straight to the next step.
  if (isSignedIn) {
    navigate(`${base}/profile`);
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
    if (!isValidPassword(password)) {
      setError(PASSWORD_REQUIREMENTS_TEXT);
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
      if (user.verified) {
        login({ userId: user.userId, token: user.token, contact, method, name: user.name });
      }
      navigate(user.verified ? `${base}/profile` : `${base}/verify`);
    } catch (err) {
      setError(err.message || "Sign in failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForgotState = () => {
    setShowForgot(false);
    setForgotStep("contact");
    setForgotContact("");
    setForgotUserId(null);
    setForgotToken(null);
    setForgotName(null);
    setForgotDigits(Array(CODE_LENGTH).fill(""));
    setNewPassword("");
    setConfirmNewPassword("");
    setError("");
  };

  const handleForgotSubmitContact = async (e) => {
    e.preventDefault();
    setError("");
    if (!forgotContact.trim()) return setError(`Enter your ${forgotMethod === "phone" ? "phone number" : "email address"}.`);
    setSubmitting(true);
    try {
      const { userId } = await forgotPassword({ contact: forgotContact, method: forgotMethod });
      setForgotUserId(userId);
      setForgotStep("otp");
    } catch (err) {
      setError(err.message || "Couldn't send a code. Check the phone/email and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotVerify = async () => {
    const code = forgotDigits.join("");
    if (code.length !== CODE_LENGTH) return setError(`Enter the ${CODE_LENGTH}-digit code.`);
    setSubmitting(true);
    setError("");
    try {
      const result = await verifyCode({ userId: forgotUserId, type: forgotMethod, code });
      if (!result.verified) {
        setError("That code didn't work. Try again.");
        return;
      }
      setForgotToken(result.token);
      setForgotName(result.name);
      setForgotStep("newPassword");
    } catch (err) {
      setError(err.message || "Verification failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotResend = async () => {
    try {
      await resendCode({ userId: forgotUserId, type: forgotMethod });
      setForgotResent(true);
      setTimeout(() => setForgotResent(false), 3000);
    } catch (err) {
      setError(err.message || "Couldn't resend the code.");
    }
  };

  const handleForgotResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    if (!isValidPassword(newPassword)) return setError(PASSWORD_REQUIREMENTS_TEXT);
    if (newPassword !== confirmNewPassword) return setError("Passwords don't match.");
    setSubmitting(true);
    try {
      await resetPassword({ userId: forgotUserId, password: newPassword, token: forgotToken });
      // The OTP step already proved this is the account owner and handed
      // back a valid session token, so sign them straight into the booking
      // flow rather than making them log in again with the password they
      // just set.
      const user = { userId: forgotUserId, token: forgotToken, contact: forgotContact, method: forgotMethod, name: forgotName };
      update({ user });
      login(user);
      navigate(`${base}/profile`);
    } catch (err) {
      setError(err.message || "Couldn't reset your password. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BookingLayout
      title={
        showForgot
          ? forgotStep === "newPassword"
            ? "New Password"
            : forgotStep === "otp"
            ? "Verify It's You"
            : "Reset Password"
          : "Sign In / Sign Up"
      }
      step={3}
      onBack={showForgot ? resetForgotState : undefined}
    >
      {showForgot ? (
        <>
          {forgotStep === "contact" && (
            <form className="booking-form" onSubmit={handleForgotSubmitContact}>
              <p className="help-text">Enter the phone number or email on your account and we'll send you a code.</p>
              <div className="method-toggle">
                <div
                  className={`method-option ${forgotMethod === "phone" ? "selected" : ""}`}
                  onClick={() => setForgotMethod("phone")}
                >
                  Phone number
                </div>
                <div
                  className={`method-option ${forgotMethod === "email" ? "selected" : ""}`}
                  onClick={() => setForgotMethod("email")}
                >
                  Email
                </div>
              </div>
              <div className="booking-field">
                <label htmlFor="forgot-contact">{forgotMethod === "phone" ? "Phone number" : "Email address"}</label>
                <input
                  id="forgot-contact"
                  className="booking-input"
                  type={forgotMethod === "email" ? "email" : "text"}
                  inputMode={forgotMethod === "phone" ? "numeric" : undefined}
                  value={forgotMethod === "phone" ? formatPhoneDisplay(forgotContact) : forgotContact}
                  onChange={(e) =>
                    setForgotContact(
                      forgotMethod === "phone" ? e.target.value.replace(/\D/g, "").slice(0, 10) : e.target.value
                    )
                  }
                  placeholder={forgotMethod === "phone" ? "(555) 555-5555" : ""}
                />
              </div>
              {error && <p className="error-text">{error}</p>}
              <button className="btn-accent" type="submit" disabled={submitting}>
                {submitting ? "Sending..." : "Send Code"}
              </button>
              <button type="button" className="resend-link" style={{ marginTop: 16 }} onClick={resetForgotState}>
                Back to Sign In
              </button>
            </form>
          )}
          {forgotStep === "otp" && (
            <>
              <p className="help-text">
                We sent a {CODE_LENGTH}-digit code to your {forgotMethod === "email" ? "email" : "phone"} (
                {forgotContact}).
                {IS_MOCK && (
                  <>
                    {" "}
                    <span className="stub-badge">Demo</span> — enter any {CODE_LENGTH} digits to continue.
                  </>
                )}
              </p>
              <div className="code-input-row">
                {forgotDigits.map((d, i) => (
                  <input
                    key={i}
                    className="code-box"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={(e) => {
                      if (!/^\d?$/.test(e.target.value)) return;
                      const next = [...forgotDigits];
                      next[i] = e.target.value;
                      setForgotDigits(next);
                    }}
                  />
                ))}
              </div>
              {error && <p className="error-text">{error}</p>}
              <button className="btn-primary" onClick={handleForgotVerify} disabled={submitting}>
                {submitting ? "Verifying..." : "Verify"}
              </button>
              <button className="resend-link" style={{ display: "block", marginTop: 16 }} onClick={handleForgotResend}>
                {forgotResent ? "Code resent" : "Resend code"}
              </button>
              <button type="button" className="resend-link" style={{ display: "block", marginTop: 8 }} onClick={resetForgotState}>
                Back to Sign In
              </button>
            </>
          )}
          {forgotStep === "newPassword" && (
            <form className="booking-form" onSubmit={handleForgotResetPassword}>
              <p className="help-text">Choose a new password for your account.</p>
              <PasswordField
                id="new-password"
                label="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                helpText={PASSWORD_REQUIREMENTS_TEXT}
              />
              <PasswordField
                id="confirm-new-password"
                label="Confirm new password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                autoComplete="new-password"
              />
              {error && <p className="error-text">{error}</p>}
              <button className="btn-accent" type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Reset Password"}
              </button>
            </form>
          )}
        </>
      ) : (
        <>
          <div className="auth-tabs">
            <div
              className={`auth-tab ${mode === "signup" ? "active" : ""}`}
              onClick={() => {
                setError("");
                setMode("signup");
              }}
            >
              Sign Up
            </div>
            <div
              className={`auth-tab ${mode === "signin" ? "active" : ""}`}
              onClick={() => {
                setError("");
                setMode("signin");
              }}
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
                inputMode={method === "phone" ? "numeric" : undefined}
                value={method === "phone" ? formatPhoneDisplay(contact) : contact}
                onChange={(e) =>
                  setContact(method === "phone" ? e.target.value.replace(/\D/g, "").slice(0, 10) : e.target.value)
                }
                placeholder={method === "phone" ? "(555) 555-5555" : ""}
              />
            </div>

            <PasswordField
              id="password"
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              helpText={mode === "signup" ? PASSWORD_REQUIREMENTS_TEXT : undefined}
            />

            <button
              type="button"
              className="resend-link"
              style={{ marginTop: -8, marginBottom: 8 }}
              onClick={() => {
                setError("");
                setForgotMethod(method);
                setForgotContact(contact);
                setShowForgot(true);
              }}
            >
              Forgot password?
            </button>

            {mode === "signup" && (
              <PasswordField
                id="confirm-password"
                label="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            )}

            {error && <p className="error-text">{error}</p>}

            <button className="btn-accent" type="submit" disabled={submitting}>
              {submitting ? "Please wait..." : mode === "signup" ? "Create Account" : "Sign In"}
            </button>
          </form>
        </>
      )}
    </BookingLayout>
  );
}
