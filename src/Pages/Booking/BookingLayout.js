import React from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../images/logo.png";
import "./booking.css";

const STEP_COUNT = 6;

export default function BookingLayout({ title, step, onBack, children }) {
  const navigate = useNavigate();
  const progressPct = Math.min(100, Math.round((step / STEP_COUNT) * 100));

  return (
    <div className="booking-page">
      <div className="booking-header">
        <button
          className="booking-back"
          aria-label="Back"
          onClick={() => (onBack ? onBack() : navigate(-1))}
        >
          ←
        </button>
        <img className="booking-logo" src={logo} alt="PRK'n" />
        <h1 className="booking-header-title">{title}</h1>
      </div>
      <div className="booking-progress-track">
        <div className="booking-progress-track-inner">
          <div className="booking-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
      </div>
      <div className="booking-content">{children}</div>
    </div>
  );
}
