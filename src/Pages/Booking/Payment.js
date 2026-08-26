import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BookingLayout from "./BookingLayout";
import { useBooking } from "../../context/BookingContext";
import { createBooking } from "../../api/client";

function hoursBetween(start, end) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return (eh * 60 + em - (sh * 60 + sm)) / 60;
}

function formatTime(t) {
  const [h, m] = t.split(":").map(Number);
  return new Date(0, 0, 0, h, m).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

const SERVICE_FEE_RATE = 0.1;

export default function Payment() {
  const { addressId, spotId } = useParams();
  const navigate = useNavigate();
  const { spot, date, startTime, endTime, user, profile, update } = useBooking();
  const [method, setMethod] = useState("card");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const base = `/r/${addressId}/${spotId}`;

  if (!profile) {
    navigate(`${base}/profile`);
    return null;
  }

  const hours = hoursBetween(startTime, endTime);
  const subtotal = hours * spot.pricePerHour;
  const serviceFee = subtotal * SERVICE_FEE_RATE;
  const total = subtotal + serviceFee;

  const handlePay = async (e) => {
    e.preventDefault();
    setError("");
    if (method === "card") {
      if (cardNumber.replace(/\s/g, "").length < 12 || !expiry || cvc.length < 3) {
        setError("Enter valid card details.");
        return;
      }
    }
    setSubmitting(true);
    const booking = await createBooking({
      spotId: spot.id,
      userId: user.userId,
      date,
      startTime,
      endTime,
      paymentMethod: method,
    });
    update({ booking });
    setSubmitting(false);
    navigate(`${base}/confirmation`);
  };

  return (
    <BookingLayout title="Payment" step={6}>
      <div className="summary-card">
        <div className="summary-row">
          <span>{spot.title}</span>
          <span>${spot.pricePerHour}/hr</span>
        </div>
        <div className="summary-row">
          <span>{date}</span>
          <span>
            {formatTime(startTime)} – {formatTime(endTime)}
          </span>
        </div>
        <div className="summary-row">
          <span>Subtotal ({hours}h)</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        <div className="summary-row">
          <span>Service fee</span>
          <span>${serviceFee.toFixed(2)}</span>
        </div>
        <div className="summary-row total">
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>

      <h3 className="booking-section-title">
        Payment method <span className="stub-badge">Demo</span>
      </h3>
      <div className="payment-method-row">
        <button
          type="button"
          className={`payment-method-btn apple ${method === "applepay" ? "selected" : ""}`}
          onClick={() => setMethod("applepay")}
        >
           Pay
        </button>
        <button
          type="button"
          className={`payment-method-btn link ${method === "link" ? "selected" : ""}`}
          onClick={() => setMethod("link")}
        >
          Link
        </button>
        <button
          type="button"
          className={`payment-method-btn ${method === "card" ? "selected" : ""}`}
          onClick={() => setMethod("card")}
        >
          Card
        </button>
      </div>

      <form className="booking-form" onSubmit={handlePay}>
        {method === "card" && (
          <>
            <div className="booking-field">
              <label htmlFor="card-number">Card number</label>
              <input
                id="card-number"
                className="booking-input"
                placeholder="4242 4242 4242 4242"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
              />
            </div>
            <div className="card-fields-row">
              <div className="booking-field" style={{ flex: 1 }}>
                <label htmlFor="expiry">Expiry</label>
                <input
                  id="expiry"
                  className="booking-input"
                  placeholder="MM/YY"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                />
              </div>
              <div className="booking-field" style={{ flex: 1 }}>
                <label htmlFor="cvc">CVC</label>
                <input
                  id="cvc"
                  className="booking-input"
                  placeholder="123"
                  value={cvc}
                  onChange={(e) => setCvc(e.target.value)}
                />
              </div>
            </div>
          </>
        )}
        {method === "applepay" && (
          <p className="help-text">Demo only — real Apple Pay opens the native payment sheet via Stripe.</p>
        )}
        {method === "link" && (
          <p className="help-text">Demo only — real Link checkout opens Stripe's Link widget.</p>
        )}

        {error && <p className="error-text">{error}</p>}

        <button className="btn-primary" type="submit" disabled={submitting}>
          {submitting ? "Processing..." : `Pay $${total.toFixed(2)}`}
        </button>
      </form>
    </BookingLayout>
  );
}
