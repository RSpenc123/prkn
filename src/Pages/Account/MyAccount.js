import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../images/logo.png";
import { useAuth } from "../../context/AuthContext";
import { getProfile, updateAccountProfile, changeAccountPassword } from "../../api/client";
import "../Booking/booking.css";
import "./account.css";

function formatPhoneDisplay(digits) {
  const d = (digits || "").slice(0, 10);
  if (d.length === 0) return "";
  if (d.length < 4) return `(${d}`;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

export default function MyAccount() {
  const navigate = useNavigate();
  const { user, isSignedIn, updateUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSaved, setPwSaved] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    if (!isSignedIn) {
      navigate("/signin");
      return;
    }
    let cancelled = false;
    getProfile({ token: user.token })
      .then((profile) => {
        if (cancelled) return;
        setName(profile.name || user.name || "");
        setEmail(profile.email || (user.method === "email" ? user.contact : ""));
        setPhone(profile.phone || (user.method === "phone" ? user.contact : ""));
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || "Couldn't load your account.");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  if (!isSignedIn) return null;

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setError("");
    setSaved(false);
    if (!name.trim()) return setError("Enter your name.");
    setSaving(true);
    try {
      await updateAccountProfile({ token: user.token, name: name.trim(), email: email.trim(), phone });
      updateUser({ name: name.trim() });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.message || "Couldn't save your changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError("");
    setPwSaved(false);
    if (newPassword.length < 8) return setPwError("New password must be at least 8 characters.");
    if (newPassword !== confirmNewPassword) return setPwError("New passwords don't match.");
    setPwSaving(true);
    try {
      await changeAccountPassword({ token: user.token, oldPassword, newPassword });
      setOldPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setPwSaved(true);
      setTimeout(() => setPwSaved(false), 3000);
    } catch (err) {
      setPwError(err.message || "Couldn't change your password.");
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className="booking-page">
      <div className="booking-header">
        <button className="booking-back" aria-label="Back" onClick={() => navigate("/")}>
          ←
        </button>
        <img className="booking-logo" src={logo} alt="PRK'n" />
        <h1 className="booking-header-title">My Account</h1>
      </div>
      <div className="booking-content">
        {loading ? (
          <p className="loading-text">Loading your account...</p>
        ) : (
          <>
            <h3 className="booking-section-title">Your info</h3>
            <form className="booking-form" onSubmit={handleSaveProfile}>
              <div className="booking-field">
                <label htmlFor="account-name">Full name</label>
                <input id="account-name" className="booking-input" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="booking-field">
                <label htmlFor="account-email">Email</label>
                <input
                  id="account-email"
                  className="booking-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="booking-field">
                <label htmlFor="account-phone">Phone number</label>
                <input
                  id="account-phone"
                  className="booking-input"
                  type="text"
                  inputMode="numeric"
                  placeholder="(555) 555-5555"
                  value={formatPhoneDisplay(phone)}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                />
              </div>
              {error && <p className="error-text">{error}</p>}
              {saved && <p className="help-text">Saved.</p>}
              <button className="btn-primary" type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save changes"}
              </button>
            </form>

            <h3 className="booking-section-title" style={{ marginTop: 32 }}>
              Change password
            </h3>
            <form className="booking-form" onSubmit={handleChangePassword}>
              <div className="booking-field">
                <label htmlFor="old-password">Current password</label>
                <input
                  id="old-password"
                  className="booking-input"
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                />
              </div>
              <div className="booking-field">
                <label htmlFor="new-password">New password</label>
                <input
                  id="new-password"
                  className="booking-input"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="booking-field">
                <label htmlFor="confirm-new-password">Confirm new password</label>
                <input
                  id="confirm-new-password"
                  className="booking-input"
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                />
              </div>
              {pwError && <p className="error-text">{pwError}</p>}
              {pwSaved && <p className="help-text">Password changed.</p>}
              <button className="btn-primary" type="submit" disabled={pwSaving}>
                {pwSaving ? "Saving..." : "Change password"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
