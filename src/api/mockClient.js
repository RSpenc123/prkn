// Mock implementations — used when REACT_APP_API_BASE_URL is not set, so
// the whole flow stays clickable with fake data and no backend. See
// client.js for the dispatcher that picks between this and realClient.js.

import { mockAddresses, mockSpots } from "./mockData";

const SIMULATED_DELAY_MS = 350;

function delay(value) {
  return new Promise((resolve) => setTimeout(() => resolve(value), SIMULATED_DELAY_MS));
}

function randomId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function searchAddress({ query }) {
  const q = (query || "").trim().toLowerCase();
  if (!q) return delay(null);
  const match = Object.values(mockAddresses).find((a) =>
    `${a.line1} ${a.city} ${a.state} ${a.zip}`.toLowerCase().includes(q)
  );
  return delay(match ? { addressId: match.id, address: match } : null);
}

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

export function getSpot(spotId) {
  const spot = mockSpots.find((s) => s.id === spotId) || null;
  const address = spot ? mockAddresses[spot.addressId] : null;
  return delay({ spot, address });
}

export function signUp({ contact, method, password, name }) {
  return delay({ userId: randomId("user"), contact, method, name, verified: false, token: null });
}

export function signIn({ contact, method, password }) {
  return delay({ userId: randomId("user"), contact, method, verified: true, token: randomId("token") });
}

export function verifyCode({ userId, code }) {
  const ok = /^\d{4}$/.test(code);
  return delay({ verified: ok });
}

export function resendCode({ userId }) {
  return delay({ sent: true });
}

export function createPaymentIntent({ amount }) {
  return delay({
    paymentIntentId: randomId("pi"),
    clientSecret: randomId("secret"),
    publishableKey: "pk_test_mock",
  });
}

export function createBooking({ spotId, date, startTime, endTime }) {
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
