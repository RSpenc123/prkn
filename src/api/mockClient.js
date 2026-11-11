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

// Mock mode's two demo addresses have no real coordinates, so there's no
// real distance to compute — just return both, each spot tagged with a
// fabricated distance, so the "nearby spots" list has something real to
// render while developing without a backend. Overrides title to the
// shared street address (mockSpots' own title is each spot's distinct
// description, used as-is by getSpotsByAddress above) — matching what the
// real mapSpot() returns, since NearbySpots groups listings by that field.
export function searchNearbySpots() {
  const spots = Object.values(mockAddresses).flatMap((address, i) =>
    mockSpots
      .filter((s) => s.addressId === address.id)
      .map((s) => ({ ...s, title: address.line1, distanceMeters: (i + 1) * 500 }))
  );
  return delay({ searchId: "near_demo", destination: null, spots });
}

export function getNearbySpotsById() {
  return searchNearbySpots();
}

export function getSpot(spotId) {
  const spot = mockSpots.find((s) => s.id === spotId) || null;
  const address = spot ? mockAddresses[spot.addressId] : null;
  return delay({ spot, address });
}

export function signUp({ contact, method, password, name }) {
  return delay({ userId: randomId("user"), contact, method, name, verified: false, token: null });
}

export function guestCheckout({ name, phone }) {
  return delay({ userId: randomId("guest"), contact: phone, method: "phone", name, verified: true, token: randomId("token") });
}

export function signIn({ contact, method, password }) {
  return delay({ userId: randomId("user"), contact, method, verified: true, token: randomId("token") });
}

export function verifyCode({ userId, code }) {
  const ok = /^\d{4}$/.test(code);
  return delay({ verified: ok, token: ok ? randomId("token") : null, name: "Demo User" });
}

export function resendCode({ userId }) {
  return delay({ sent: true });
}

export function forgotPassword({ contact, method }) {
  return delay({ userId: randomId("user") });
}

export function resetPassword({ userId, password, token }) {
  return delay({ success: true });
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

const mockAccounts = {};

export function getProfile({ token }) {
  return delay(mockAccounts[token] || { name: "Demo User", email: "demo@example.com", phone: "5555550123" });
}

export function updateAccountProfile({ token, name, email, phone }) {
  mockAccounts[token] = { name, email, phone };
  return delay({ ok: true });
}

export function changeAccountPassword() {
  return delay({ ok: true });
}

export function getMyBookings() {
  return delay(
    mockSpots.slice(0, 2).map((spot, i) => ({
      id: randomId("booking"),
      spotId: spot.id,
      spotTitle: spot.title,
      startTime: Date.now() - (i + 1) * 86400000,
      endTime: Date.now() - (i + 1) * 86400000 + 3600000,
      amount: spot.pricePerHour,
      status: "Booked",
      createdAt: Date.now() - (i + 1) * 86400000,
    }))
  );
}

export function logoutUser() {
  return delay({ ok: true });
}

export function deleteAccount() {
  return delay({ ok: true });
}
