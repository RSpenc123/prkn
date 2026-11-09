import React, { useState } from "react";

// Matches the backend's password rule exactly (auth.schema.ts:
// ^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9]).{8,}$) so the site can reject a bad
// password before round-tripping to the server, and so the same requirement
// text shown here matches what the server would say anyway.
export const PASSWORD_REQUIREMENTS_TEXT = "Use at least 8 characters, upper case, lower case, and a number.";
const PASSWORD_PATTERN = /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9]).{8,}$/;

export function isValidPassword(password) {
  return PASSWORD_PATTERN.test(password || "");
}

function EyeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.3 21.3 0 0 1 5.06-6.06M9.9 4.24A10.4 10.4 0 0 1 12 4c7 0 11 8 11 8a21.3 21.3 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

// A password <input> with a show/hide "eye" toggle, styled to drop into the
// existing .booking-field / .booking-input markup used across the sign
// in/sign up forms.
export default function PasswordField({ id, label, value, onChange, autoComplete, helpText }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="booking-field">
      <label htmlFor={id}>{label}</label>
      <div className="password-input-wrapper">
        <input
          id={id}
          className="booking-input"
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          className="password-toggle-btn"
          tabIndex={-1}
          aria-label={visible ? "Hide password" : "Show password"}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
      {helpText && <p className="password-help-text">{helpText}</p>}
    </div>
  );
}
