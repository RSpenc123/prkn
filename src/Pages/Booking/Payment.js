import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import BookingLayout from "./BookingLayout";
import { useBooking } from "../../context/BookingContext";
import { IS_MOCK, createBooking, createPaymentIntent } from "../../api/client";

function hoursBetween(start, end) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return (eh * 60 + em - (sh * 60 + sm)) / 60;
}

function formatTime(t) {
  const [h, m] = t.split(":").map(Number);
  return new Date(0, 0, 0, h, m).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

// Real Stripe Elements form — only rendered once a PaymentIntent exists.
function StripePaymentForm({ amount, onSuccess, onError }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    const { error, paymentIntent } = await stripe.confirmPayment({ elements, redirect: "if_required" });
    setSubmitting(false);
    if (error) {
      onError(error.message || "Payment failed.");
      return;
    }
    if (paymentIntent && paymentIntent.status === "succeeded") {
      onSuccess(paymentIntent.id);
    } else {
      onError("Payment didn't complete. Try again.");
    }
  };

  return (
    <form className="booking-form" onSubmit={handleSubmit}>
      <PaymentElement />
      <button className="btn-primary" type="submit" disabled={!stripe || submitting}>
        {submitting ? "Processing..." : `Pay $${amount.toFixed(2)}`}
      </button>
    </form>
  );
}

// Stubbed payment UI used only when no backend is configured (mock mode).
function StubPaymentForm({ amount, onPay }) {
  const [method, setMethod] = useState("card");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handlePay = async (e) => {
    e.preventDefault();
    setError("");
    if (method === "card" && (cardNumber.replace(/\s/g, "").length < 12 || !expiry || cvc.length < 3)) {
      setError("Enter valid card details.");
      return;
    }
    setSubmitting(true);
    await onPay(`mock_txn_${Math.random().toString(36).slice(2, 10)}`);
    setSubmitting(false);
  };

  return (
    <>
      <h3 className="booking-section-title">
        Payment method <span className="stub-badge">Demo</span>
      </h3>
      <div className="payment-method-row">
        <button type="button" className={`payment-method-btn apple ${method === "applepay" ? "selected" : ""}`} onClick={() => setMethod("applepay")}>
           Pay
        </button>
        <button type="button" className={`payment-method-btn link ${method === "link" ? "selected" : ""}`} onClick={() => setMethod("link")}>
          Link
        </button>
        <button type="button" className={`payment-method-btn ${method === "card" ? "selected" : ""}`} onClick={() => setMethod("card")}>
          Card
        </button>
      </div>

      <form className="booking-form" onSubmit={handlePay}>
        {method === "card" && (
          <>
            <div className="booking-field">
              <label htmlFor="card-number">Card number</label>
              <input id="card-number" className="booking-input" placeholder="4242 4242 4242 4242" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} />
            </div>
            <div className="card-fields-row">
              <div className="booking-field" style={{ flex: 1 }}>
                <label htmlFor="expiry">Expiry</label>
                <input id="expiry" className="booking-input" placeholder="MM/YY" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
              </div>
              <div className="booking-field" style={{ flex: 1 }}>
                <label htmlFor="cvc">CVC</label>
                <input id="cvc" className="booking-input" placeholder="123" value={cvc} onChange={(e) => setCvc(e.target.value)} />
              </div>
            </div>
          </>
        )}
        {method === "applepay" && <p className="help-text">Demo only — real Apple Pay opens the native payment sheet via Stripe.</p>}
        {method === "link" && <p className="help-text">Demo only — real Link checkout opens Stripe's Link widget.</p>}
        {error && <p className="error-text">{error}</p>}
        <button className="btn-primary" type="submit" disabled={submitting}>
          {submitting ? "Processing..." : `Pay $${amount.toFixed(2)}`}
        </button>
      </form>
    </>
  );
}

export default function Payment() {
  const { addressId, spotId } = useParams();
  const navigate = useNavigate();
  const { spot, date, startTime, endTime, availabilityId, priceType, user, profile, update } = useBooking();
  const [error, setError] = useState("");
  const [stripePromise, setStripePromise] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);
  const [loadingIntent, setLoadingIntent] = useState(!IS_MOCK);

  const base = `/r/${addressId}/${spotId}`;

  const hours = spot && startTime && endTime ? hoursBetween(startTime, endTime) : 0;
  const amount = spot ? parseFloat((hours * spot.pricePerHour).toFixed(2)) : 0;

  useEffect(() => {
    if (IS_MOCK || !profile || !amount) return;
    let cancelled = false;
    createPaymentIntent({ amount, token: user.token })
      .then(({ clientSecret, publishableKey }) => {
        if (cancelled) return;
        setStripePromise(loadStripe(publishableKey));
        setClientSecret(clientSecret);
        setLoadingIntent(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || "Couldn't start payment.");
        setLoadingIntent(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  if (!profile) {
    navigate(`${base}/profile`);
    return null;
  }

  const finalizeBooking = async (transactionId) => {
    setError("");
    try {
      const booking = await createBooking({
        token: user.token,
        spotId: spot.id,
        availabilityId,
        priceType,
        date,
        startTime,
        endTime,
        hours,
        amount,
        name: profile.name,
        contact: user.contact,
        method: user.method,
        carMake: profile.carMake,
        carModel: profile.carModel,
        transactionId,
      });
      update({ booking });
      navigate(`${base}/confirmation`);
    } catch (err) {
      setError(err.message || "Payment succeeded but the booking couldn't be saved. Contact support.");
    }
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
        <div className="summary-row total">
          <span>Total ({hours}h)</span>
          <span>${amount.toFixed(2)}</span>
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}

      {IS_MOCK ? (
        <StubPaymentForm amount={amount} onPay={finalizeBooking} />
      ) : loadingIntent ? (
        <p className="loading-text">Preparing payment...</p>
      ) : clientSecret && stripePromise ? (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <StripePaymentForm amount={amount} onSuccess={finalizeBooking} onError={setError} />
        </Elements>
      ) : (
        <p className="error-text">Payment isn't available right now.</p>
      )}
    </BookingLayout>
  );
}
