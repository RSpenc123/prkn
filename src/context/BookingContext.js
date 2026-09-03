import React, { createContext, useContext, useEffect, useState } from "react";

// Carries state through the checkout wizard (spot -> auth -> verify ->
// profile -> payment -> confirmation). Backed by sessionStorage so a
// refresh mid-checkout doesn't lose progress; it's cleared once a booking
// is confirmed.

const STORAGE_KEY = "prkn_booking_state";

const defaultState = {
  addressId: null,
  address: null,
  spot: null,
  date: null,
  startTime: null,
  endTime: null,
  availabilityId: null, // the specific real-backend availability slot being booked
  priceType: null, // 'Hourly' | 'Daily', from that availability
  // { userId, contact, method, name, verified, token, password }. The
  // real backend's verifyOtp doesn't return a token, so a plaintext
  // password is held here briefly to silently re-login and obtain one —
  // it never leaves this session (sessionStorage, cleared on booking).
  user: null,
  profile: null, // { name, carMake, carModel }
  booking: null, // set once payment completes
};

function loadInitialState() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? { ...defaultState, ...JSON.parse(raw) } : defaultState;
  } catch {
    return defaultState;
  }
}

const BookingContext = createContext(null);

export function BookingProvider({ children }) {
  const [state, setState] = useState(loadInitialState);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // sessionStorage unavailable — checkout still works, just won't survive a refresh
    }
  }, [state]);

  const update = (patch) => setState((prev) => ({ ...prev, ...patch }));

  const reset = () => {
    setState(defaultState);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  return (
    <BookingContext.Provider value={{ ...state, update, reset }}>
      {children}
    </BookingContext.Provider>
  );
}

export function useBooking() {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error("useBooking must be used within a BookingProvider");
  return ctx;
}
