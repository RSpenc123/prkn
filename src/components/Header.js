import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../images/logo.png";
import burger from "../images/burger.png";
import { useAuth } from "../context/AuthContext";
import { logoutUser, deleteAccount } from "../api/client";
import "./Header.css";

export default function Header() {
  const navigate = useNavigate();
  const { user, isSignedIn, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [menuOpen]);

  const goHome = () => {
    setMenuOpen(false);
    navigate("/");
  };

  const handleLogout = async () => {
    setMenuOpen(false);
    try {
      await logoutUser({ token: user?.token });
    } finally {
      logout();
      navigate("/");
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("Delete your account? This can't be undone.")) return;
    setDeleting(true);
    try {
      await deleteAccount({ userId: user?.userId, token: user?.token });
      logout();
      navigate("/");
    } catch (err) {
      window.alert(err.message || "Couldn't delete your account. Try again.");
    } finally {
      setDeleting(false);
      setMenuOpen(false);
    }
  };

  return (
    <header className="site-header">
      <img className="site-header-logo" src={logo} alt="PRK'n" onClick={goHome} />

      {isSignedIn ? (
        <div className="site-header-menu" ref={menuRef}>
          <button
            type="button"
            className="site-header-burger"
            aria-label="Account menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <img src={burger} alt="" />
          </button>
          {menuOpen && (
            <div className="site-header-dropdown">
              <button type="button" onClick={() => { setMenuOpen(false); navigate("/account/bookings"); }}>
                Manage Bookings
              </button>
              <button type="button" onClick={() => { setMenuOpen(false); navigate("/account"); }}>
                My Account
              </button>
              <button type="button" onClick={handleLogout}>
                Log Out
              </button>
              <button type="button" className="site-header-danger" onClick={handleDeleteAccount} disabled={deleting}>
                {deleting ? "Deleting..." : "Delete Account"}
              </button>
            </div>
          )}
        </div>
      ) : (
        <button type="button" className="site-header-signup" onClick={() => navigate("/signin")}>
          Sign Up
        </button>
      )}
    </header>
  );
}
