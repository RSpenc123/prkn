// API client for the rental/checkout flow.
//
// Dispatches to a real backend (realClient.js) when REACT_APP_API_BASE_URL
// is set, otherwise falls back to mock data (mockClient.js) so the flow
// stays clickable with zero setup. See realClient.js for the documented
// route contract this depends on, and README.md for the env vars needed
// to go live (API base URL, Google Maps key for geocoding).

import * as mockClient from "./mockClient";
import * as realClient from "./realClient";

const client = process.env.REACT_APP_API_BASE_URL ? realClient : mockClient;

// Lets pages drop "Demo" messaging once a real backend is configured.
export const IS_MOCK = client === mockClient;

export const searchAddress = client.searchAddress;
export const getSpotsByAddress = client.getSpotsByAddress;
export const getSpot = client.getSpot;
export const signUp = client.signUp;
export const signIn = client.signIn;
export const verifyCode = client.verifyCode;
export const resendCode = client.resendCode;
export const createPaymentIntent = client.createPaymentIntent;
export const createBooking = client.createBooking;

// Only meaningful against the real backend — a no-op passthrough in mock
// mode since mock signIn/signUp already return a usable token.
export const ensureToken = client === realClient ? realClient.ensureToken : async ({ token }) => token;
