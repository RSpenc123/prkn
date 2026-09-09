import React, { useState } from "react";
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

// Real Stripe Elements form. Elements is initialized in "deferred intent"
// mode (see the Payment component below) with an explicit paymentMethodTypes
// list of just ['card', 'link'] — that's what actually keeps Cash App Pay,
// bank transfers, etc. off this form. Those can't be filtered out via a
// PaymentElement option on an *existing* PaymentIntent (that's controlled
// entirely by what the backend/Dashboard enabled when creating it), but in
// deferred mode nothing is submitted that Elements wasn't told to render in
// the first place — the actual PaymentIntent only gets created (via
// createPaymentIntent, still the same backend call) once the customer
// submits, using elements.submit() to validate first.
function StripePaymentForm({ amount, token, onSuccess, onError }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      onError(submitError.message || "Check your payment details.");
      setSubmitting(false);
      return;
    }

    let clientSecret;
    try {
      const result = await createPaymentIntent({ amount, token });
      clientSecret = result.clientSecret;
    } catch (err) {
      onError(err.message || "Couldn't start payment.");
      setSubmitting(false);
      return;
    }

    // return_url is where the bank sends the customer back to if the card
    // needs extra verification (3D Secure) — without it, that step can
    // fail outright instead of just not being needed. redirect:
    // "if_required" still keeps the customer on this page for cards that
    // don't need it, which is the common case.
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      clientSecret,
      redirect: "if_required",
      confirmParams: { return_url: window.location.href },
    });
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
      <PaymentElement
        options={{
          paymentMethodOrder: ["card", "apple_pay", "google_pay", "link"],
          wallets: { applePay: "auto", googlePay: "auto" },
        }}
      />
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
        <button type="button" className={`payment-method-btn ${method === "card" ? "selected" : ""}`} onClick={() => setMethod("card")}>
          Card
        </button>
        <button type="button" className={`payment-method-btn apple ${method === "applepay" ? "selected" : ""}`} onClick={() => setMethod("applepay")}>
           Pay
        </button>
        <button type="button" className={`payment-method-btn link ${method === "link" ? "selected" : ""}`} onClick={() => setMethod("link")}>
          Link
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

// Loaded once at module scope, not per-render. Publishable keys are safe
// to ship in frontend code/env (that's what they're for) — this is the
// one thing that has to come from the website's own env rather than the
// backend, since Elements now initializes in deferred-intent mode (see
// StripePaymentForm above) before any PaymentIntent — and so before any
// backend call — exists yet.
const stripePromise =
  !IS_MOCK && process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY
    ? loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY)
    : null;

export default function Payment() {
  const { addressId, spotId } = useParams();
  const navigate = useNavigate();
  const { spot, date, startTime, endTime, availabilityId, priceType, user, profile, update } = useBooking();
  const [error, setError] = useState("");

  const base = `/r/${addressId}/${spotId}`;

  const hours = spot && startTime && endTime ? hoursBetween(startTime, endTime) : 0;
  const amount = spot ? parseFloat((hours * spot.pricePerHour).toFixed(2)) : 0;

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
        spotSize: spot.size,
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
        phone: profile.phone,
        carMake: profile.carMake,
        carModel: profile.carModel,
        vehicleNumber: profile.vehicleNumber,
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
      ) : !amount || amount <= 0 ? (
        <p className="error-text">This spot doesn't have a valid price set yet — contact the host before booking.</p>
      ) : !stripePromise ? (
        <p className="error-text">
          Payment isn't configured yet — missing REACT_APP_STRIPE_PUBLISHABLE_KEY.
        </p>
      ) : (
        <Elements
          stripe={stripePromise}
          options={{
            mode: "payment",
            amount: Math.round(amount * 100),
            currency: "usd",
            // The actual mechanism that keeps Cash App Pay/bank transfers
            // off this form — see StripePaymentForm's comment above.
            paymentMethodTypes: ["card", "link"],
          }}
        >
          <StripePaymentForm amount={amount} token={user.token} onSuccess={finalizeBooking} onError={setError} />
        </Elements>
      )}
    </BookingLayout>
  );
}
