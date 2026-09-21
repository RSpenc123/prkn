import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import BookingLayout from "./BookingLayout";
import { useBooking } from "../../context/BookingContext";
import {
  IS_MOCK,
  createBooking,
  createPaymentIntent,
  createPendingBooking,
  confirmBookingPayment,
  cancelPendingBooking,
} from "../../api/client";

function hoursBetween(start, end) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return (eh * 60 + em - (sh * 60 + sm)) / 60;
}

function formatTime(t) {
  const [h, m] = t.split(":").map(Number);
  return new Date(0, 0, 0, h, m).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

// Real Stripe Elements form, initialized in "deferred intent" mode (see the
// Payment component below) — the actual PaymentIntent only gets created
// (via createPaymentIntent, still the same backend call) once the customer
// submits, using elements.submit() to validate first.
//
// Elements is left to auto-detect available payment methods (no explicit
// paymentMethodTypes list) because the backend always creates the real
// PaymentIntent with automatic_payment_methods enabled, not an explicit
// type list — confirmed by reading booking.controller.ts's payment-sheet
// route on the backend's production branch. Stripe requires those two to
// agree: an Elements instance told an explicit type list can't confirm a
// PaymentIntent that was created with automatic_payment_methods (or vice
// versa) — "Payment details were collected through Stripe Elements using
// payment_method_types and cannot be confirmed through the API configured
// with automatic payment methods." So whatever's enabled in the Stripe
// Dashboard for this account is what shows here; narrowing that list (to
// exclude Cash App Pay, bank transfers, etc.) has to happen in the
// Dashboard, not in this file — there's no backend change in scope here to
// pair with a client-side type list.
function StripePaymentForm({ amount, token, onCreatePendingBooking, onSuccess, onError }) {
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

    // The backend now requires a pending booking to already exist before
    // it'll create a PaymentIntent (it looks up the charge amount and host
    // payout account from that booking, not from whatever the client
    // sends) — see createPendingBooking's doc comment in realClient.js.
    let pending;
    try {
      pending = await onCreatePendingBooking();
    } catch (err) {
      onError(err.message || "Couldn't reserve this spot. Try again.");
      setSubmitting(false);
      return;
    }

    let clientSecret;
    try {
      const result = await createPaymentIntent({ amount, bookingId: pending.bookingId, token });
      clientSecret = result.clientSecret;
    } catch (err) {
      onError(err.message || "Couldn't start payment.");
      setSubmitting(false);
      cancelPendingBooking({ token, bookingId: pending.bookingId, spotId: pending.spotId });
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
      cancelPendingBooking({ token, bookingId: pending.bookingId, spotId: pending.spotId });
      return;
    }
    if (paymentIntent && paymentIntent.status === "succeeded") {
      onSuccess(pending.bookingId, pending.spotId, paymentIntent.id);
    } else {
      onError("Payment didn't complete. Try again.");
      cancelPendingBooking({ token, bookingId: pending.bookingId, spotId: pending.spotId });
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

  // Mock mode: no real backend ordering constraint, so this stays the
  // original single-step "create the booking once payment succeeds" flow.
  const finalizeMockBooking = async (transactionId) => {
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

  // Real mode: the backend now requires the booking to exist (PENDING)
  // before it'll issue a PaymentIntent — see createPendingBooking's doc
  // comment in realClient.js. StripePaymentForm creates it via this
  // callback right before requesting payment.
  const createPending = () =>
    createPendingBooking({
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
    });

  const finalizeRealBooking = async (bookingId, pendingSpotId, transactionId) => {
    setError("");
    try {
      const booking = await confirmBookingPayment({
        token: user.token,
        bookingId,
        spotId: pendingSpotId,
        amount,
        transactionId,
        date,
        startTime,
        endTime,
      });
      update({ booking });
      navigate(`${base}/confirmation`);
    } catch (err) {
      setError(err.message || "Payment succeeded but the booking couldn't be confirmed. Contact support.");
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
        <StubPaymentForm amount={amount} onPay={finalizeMockBooking} />
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
            // No explicit paymentMethodTypes here — see StripePaymentForm's
            // comment above for why that has to match the backend's
            // automatic_payment_methods PaymentIntent, not fight it.
          }}
        >
          <StripePaymentForm
            amount={amount}
            token={user.token}
            onCreatePendingBooking={createPending}
            onSuccess={finalizeRealBooking}
            onError={setError}
          />
        </Elements>
      )}
    </BookingLayout>
  );
}
