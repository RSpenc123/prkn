import React, { useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BookingLayout from "./BookingLayout";
import { useBooking } from "../../context/BookingContext";
import { IS_MOCK, ensureToken, resendCode, verifyCode } from "../../api/client";

const CODE_LENGTH = 4;

export default function VerifyCode() {
  const { addressId, spotId } = useParams();
  const navigate = useNavigate();
  const { user, update } = useBooking();
  const [digits, setDigits] = useState(Array(CODE_LENGTH).fill(""));
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resent, setResent] = useState(false);
  const inputRefs = useRef([]);

  const base = `/r/${addressId}/${spotId}`;

  if (!user) {
    navigate(`${base}/auth`);
    return null;
  }

  const handleChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    if (value && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = digits.join("");
    if (code.length !== CODE_LENGTH) {
      setError(`Enter the ${CODE_LENGTH}-digit code.`);
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const result = await verifyCode({ userId: user.userId, type: user.method, code });
      if (!result.verified) {
        setError("That code didn't work. Try again.");
        return;
      }
      const token = await ensureToken(user);
      update({ user: { ...user, verified: true, token } });
      navigate(`${base}/profile`);
    } catch (err) {
      setError(err.message || "Verification failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    try {
      await resendCode({ userId: user.userId, type: user.method });
      setResent(true);
      setTimeout(() => setResent(false), 3000);
    } catch (err) {
      setError(err.message || "Couldn't resend the code.");
    }
  };

  return (
    <BookingLayout title="Verify It's You" step={4}>
      <p className="help-text">
        We sent a {CODE_LENGTH}-digit code to your {user.method === "email" ? "email" : "phone"} ({user.contact}).
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
            ref={(el) => (inputRefs.current[i] = el)}
            className="code-box"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
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
    </BookingLayout>
  );
}
