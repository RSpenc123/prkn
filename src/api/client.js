// API client for the rental/checkout flow.
//
// Every function below is currently backed by mock data (mockData.js) and
// simulated network delay/randomized IDs, so the whole flow is clickable
// end to end with no backend yet.
//
// TO GO LIVE: replace the body of each function with a real `fetch(...)`
// call against your MongoDB-backed API and delete the mock imports. The
// function signatures and return shapes are the contract the UI already
// depends on — keep them the same and nothing else in src/Pages/Booking
// needs to change. Each function below documents the real endpoint it
// stands in for.
//
// Two things that must NOT be added here:
//   - Stripe secret keys / MongoDB connection strings (server-side only)
//   - Direct calls to Twilio or Stripe APIs from the browser
// Those all belong behind your backend; this file only talks to your API.

import { mockAddresses, mockSpots } from "./mockData";

const SIMULATED_DELAY_MS = 350;

function delay(value) {
  return new Promise((resolve) => setTimeout(() => resolve(value), SIMULATED_DELAY_MS));
}

function randomId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

// GET /addresses/:addressId/spots
// Real backend needs a way to group spots by address (e.g. an `addressId`
// or `locationId` field on each spot document) — today spots don't appear
// to be grouped that way, so this is the field to add.
export function getSpotsByAddress(addressId) {
  const address = mockAddresses[addressId] || {
    id: addressId,
    line1: "Unknown address",
    city: "",
    state: "",
    zip: "",
  };
  const spots = mockSpots.filter((s) => s.addressId === addressId);
  return delay({ address, spots });
}

// GET /spots/:spotId
export function getSpot(spotId) {
  const spot = mockSpots.find((s) => s.id === spotId) || null;
  const address = spot ? mockAddresses[spot.addressId] : null;
  return delay({ spot, address });
}

// POST /auth/sign-up { contact, method: 'email'|'phone', password }
// Real backend should create the user and trigger a verification code via
// Twilio (SMS) or email — do not send the code from the frontend.
export function signUp({ contact, method, password }) {
  return delay({ userId: randomId("user"), contact, method, verified: false });
}

// POST /auth/sign-in { contact, password }
export function signIn({ contact, password }) {
  return delay({ userId: randomId("user"), contact, verified: true });
}

// POST /auth/verify { userId, code }
// Mock accepts any 6-digit code. Real backend validates the Twilio/email
// code server-side and never trusts the client's claim of success.
export function verifyCode({ userId, code }) {
  const ok = /^\d{6}$/.test(code);
  return delay({ verified: ok });
}

// POST /auth/resend-code { userId }
export function resendCode({ userId }) {
  return delay({ sent: true });
}

// PATCH /users/:userId/profile { name, carMake, carModel }
export function saveProfile({ userId, name, carMake, carModel }) {
  return delay({ userId, name, carMake, carModel });
}

// POST /bookings — creates a PaymentIntent server-side with Stripe, then
// the booking, and (on success) triggers the confirmation text via Twilio.
// The frontend should never touch a Stripe secret key; in the real
// integration this call would instead confirm a Stripe PaymentIntent
// client-side (Stripe.js / Payment Element) and let the backend create
// the booking from a webhook.
export function createBooking({ spotId, userId, date, startTime, endTime, paymentMethod }) {
  return delay({
    bookingId: randomId("booking"),
    confirmationCode: randomId("conf").slice(-6).toUpperCase(),
    spotId,
    date,
    startTime,
    endTime,
    status: "confirmed",
  });
}
