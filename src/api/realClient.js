// Real implementations, talking to the actual NestJS/MongoDB backend
// (github.com/omkar-nanda-ditstek/parking-slot). Active only when
// REACT_APP_API_BASE_URL is set — see client.js for the dispatcher.
//
// Route contract this file depends on (confirmed by reading the backend
// source directly, not guessed):
//   POST /api/searchParking        public   { search, latitude, longitude, userLat, userLong, price, start_date_time, end_date_time, unit, user_id, filter }
//   GET  /api/getParkingDetail/:id public
//   POST /api/signupNew            public   { type, name, email?, phone_no?, password, role? }
//   POST /api/loginNew             public   { type, email?, phone_no?, password, device_token, latitude, longitude }
//   POST /api/verifyOtp            public   { user_id, type, otp } -- otp is a 4-digit NUMBER
//   POST /api/resendOtp            public   { user_id, type }
//   POST /api/payment-sheet        JWT      { booking_id } -> Stripe PaymentIntent (client_secret + publishableKey).
//                                            Requires a PENDING booking (status 'pending') already owned by this
//                                            renter to exist — the backend computes the charge amount itself from
//                                            that booking's BookingStatus rows and throws "Pending booking not
//                                            found for this renter" otherwise. So createBooking has to run BEFORE
//                                            this, not after (confirmed by reading the actual production branch of
//                                            the backend, which differs from what's on its default/master branch).
//   POST /api/createBooking        JWT      { name, email, phone_no, car_model, vehicle_number, availability_ids, slots[], spot_id, amount, transaction_id, grandTotal }
//                                            transaction_id may be "" at this point (schema allows empty) — the
//                                            real Stripe payment intent id isn't known yet. Creates the booking in
//                                            PENDING status.
//   POST /api/updateBookingStatus  JWT      { booking_id, transaction_id, status: "Booked", spot_id, amount, timezone }
//                                            Called once payment actually succeeds, with the real transaction id.
//                                            Also accepts status: "Payment Failed" to clean up an abandoned pending
//                                            booking if payment never completes.
//   POST /api/getBookingsByAvailabilitytId  public  { availability_id }
//   GET  /api/getProfile           JWT      -> current user's record
//   POST /api/updateProfileAndAddress JWT   { name?, email?, phone_no?, ... } (all optional strings)
//   POST /api/changePassword       JWT      { old_password, password }
//   POST /api/getBookingsForRenter JWT      { booking_status? } -> this user's bookings
//   POST /api/logout               JWT      clears device_token server-side
//   DELETE /api/deleteUser/:id     public (!) — no auth guard on the backend; see deleteAccount() below
//
// Every JWT-guarded route needs `Authorization: Bearer <token>` — the token
// comes back on signupNew (new accounts only) and loginNew. See ensureToken()
// below for the case where signup doesn't hand back a token (an existing,
// not-yet-verified account "failing" signup with that account's data instead).
//
// Phone signup/login's phone_no must be sent as E.164 ("+1XXXXXXXXXX") —
// the backend matches it as a literal string with no normalization, and
// that's the format it's actually stored in (confirmed via the admin
// panel). See toE164() below.
//
// KNOWN SIMPLIFICATIONS (documented, not silently guessed):
//   - Spots don't have a "title" field in the real schema; `description` is
//     used instead, falling back to the street address.
//   - getParkingDetail returns each spot's raw host-set `price`, without the
//     host/admin/renter fee markup that searchParking's calculateAmount()
//     applies. Card prices (from search) and the detail-page price can
//     legitimately differ until that's reconciled with a backend change.
//   - There's no "address" entity with its own ID — addresses are just
//     fields on each Spot. addressId here is a lat/lng pair we synthesize
//     ourselves (see encodeAddressKey), and "spots at this address" means
//     "spots within ~60m of that point."
//   - Phone number and license plate are collected on the Profile step
//     (phone only if the user signed up by email — phone signups already
//     have one). Both stay optional there since the backend schema allows
//     empty values for them.

import { loadGoogleMapsScript } from "../utils/googleMaps";

const API_BASE = (process.env.REACT_APP_API_BASE_URL || "").replace(/\/$/, "");
const NEARBY_METERS = 60;

function resolveMediaUrl(path) {
  if (!path) return path;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
}

// The backend matches phone_no as a literal string with no normalization
// (`userModel.findOne({ phone_no })`), and stores it in E.164 form (e.g.
// "+19493102642", confirmed against the admin panel's user list) — so
// signup/login must send exactly that shape or an existing account won't
// be found. US-only for now, matching the 10-digit cap on the phone input.
function toE164(digits) {
  return `+1${digits}`;
}

function messageText(message) {
  if (Array.isArray(message)) {
    return message.map((m) => (typeof m === "string" ? m : m.message || JSON.stringify(m))).join(" ");
  }
  return message || "Something went wrong.";
}

async function request(path, { method = "GET", body, token } = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr) {
    throw new Error("Couldn't reach the server. Check your connection and try again.");
  }
  let json = null;
  try {
    json = await res.json();
  } catch {
    // non-JSON response body
  }
  if (!res.ok && !json) {
    throw new Error(`Request failed (${res.status}).`);
  }
  return json || {};
}

function toHHMM(date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function toDateStr(date) {
  return date.toISOString().slice(0, 10);
}

function encodeAddressKey(lat, lng) {
  return `${Number(lat).toFixed(5)},${Number(lng).toFixed(5)}`;
}

function decodeAddressKey(key) {
  const [lat, lng] = decodeURIComponent(key).split(",").map(Number);
  return { lat, lng };
}

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function mapAddressFromSpot(raw) {
  return {
    id: encodeAddressKey(raw.latitude, raw.longitude),
    line1: raw.address_line_1 || "",
    line2: raw.address_line_2 || "",
    city: raw.city || "",
    state: raw.state || "",
    zip: raw.zip_code || "",
  };
}

// The top-level Spot.price field is only reliably set for spots created
// through the newer add-spot flow — older spots only have real pricing on
// each individual availability slot. Prefer the cheapest available slot's
// price (a normal "starting at $X/hr" display) and only fall back to the
// spot-level price if no slot pricing is present at all.
function derivePricePerHour(raw, availability) {
  const slotPrices = availability
    .map((a) => Number(a.priceRaw))
    .filter((p) => !isNaN(p) && p > 0);
  if (slotPrices.length) return Math.min(...slotPrices);
  return Number(raw.price) || 0;
}

function mapSpot(raw) {
  const availability = (raw.availabilities || []).map((a) => {
    const start = new Date(Number(a.start_date_time));
    const end = new Date(Number(a.end_date_time));
    return {
      date: toDateStr(start),
      slots: [{ start: toHHMM(start), end: toHHMM(end) }],
      availabilityId: a._id || a.reference_id,
      priceRaw: a.price,
      priceType: a.price_type || "Hourly",
      // "Fully Available" | "Partially Available" | "Fully Booked" |
      // "Currently Unavailable" | "Expired" — maintained server-side as
      // bookings come and go. SpotDetail excludes the fully-booked/
      // unavailable/expired ones so an already-fully-rented window can't
      // be selected and paid for again.
      availabilityStatus: a.availability_status || null,
    };
  });
  return {
    id: raw._id,
    addressId: encodeAddressKey(raw.latitude, raw.longitude),
    // Prefer the street address over the description — using the
    // description here meant it showed up twice on the detail page once
    // that page also started showing the description in its own labeled
    // section. City is shown separately alongside this on the spots list,
    // so leading with the address (not city again) avoids repeating it.
    title: raw.address_line_1 || raw.city || (raw.description ? raw.description.slice(0, 60) : "Parking spot"),
    description: raw.description || "",
    photos: (raw.images || []).map(resolveMediaUrl),
    pricePerHour: derivePricePerHour(raw, availability),
    status: raw.status === "active" && raw.availability_status !== "Fully Booked" ? "available" : "booked",
    availability,
    // The host's own size-category id for this spot. createBooking needs
    // *a* size id to look up — see the size note on createBooking() below.
    size: raw.size || null,
    // getParkingDetail includes both of these directly (size_details from
    // the sizeService lookup, host_details from the spot's owner) — not
    // used before now.
    sizeTitle: raw.size_details?.title || null,
    host: raw.host_details
      ? {
          name: raw.host_details.name || "",
          // reviewAverageSpot()'s return shape isn't confirmed from source,
          // so this only trusts it when it's plainly a positive number —
          // anything else (0, null, an object) falls back to "No Reviews"
          // rather than risk showing something wrong.
          rating: typeof raw.host_details.ratings === "number" && raw.host_details.ratings > 0 ? raw.host_details.ratings : null,
        }
      : null,
  };
}

async function searchParkingRaw({ latitude, longitude }) {
  const res = await request("/api/searchParking", {
    method: "POST",
    body: {
      search: "",
      latitude,
      longitude,
      userLat: latitude,
      userLong: longitude,
      price: "",
      start_date_time: "",
      end_date_time: "",
      unit: "mi",
      user_id: "",
      filter: "All",
    },
  });
  return Array.isArray(res.data) ? res.data : [];
}

// Resolves free-typed text to a location — used when someone types and
// submits without picking an autocomplete suggestion. Uses Places'
// findPlaceFromQuery rather than the Geocoder, since the Geocoder only
// understands addresses; findPlaceFromQuery also matches business/place
// names ("Joe's Pizza"), same as the autocomplete dropdown does.
//
// Runs through the Maps JavaScript SDK, not the raw REST endpoint — a
// website-restricted API key (the kind safe to ship in frontend code) is
// rejected by Google's raw Geocoding REST API with "API keys with referer
// restrictions cannot be used with this API." The JS SDK, loaded via
// <script> the same way Places Autocomplete is, is exactly what referrer
// restrictions are designed for and works fine.
async function geocodeAddress(query) {
  const google = await loadGoogleMapsScript();
  const service = new google.maps.places.PlacesService(document.createElement("div"));
  return new Promise((resolve, reject) => {
    service.findPlaceFromQuery(
      { query, fields: ["geometry", "name", "formatted_address"] },
      (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
          resolve(null);
          return;
        }
        if (status !== google.maps.places.PlacesServiceStatus.OK || !results?.length) {
          // REQUEST_DENIED / OVER_QUERY_LIMIT / INVALID_REQUEST etc. — a
          // real, fixable problem, not "no such place." Surface it
          // instead of silently returning null.
          reject(new Error(`Google Places search failed (${status}).`));
          return;
        }
        const loc = results[0].geometry.location;
        resolve({ lat: loc.lat(), lng: loc.lng() });
      }
    );
  });
}

// `coords`, when provided (the user picked a Places autocomplete
// suggestion), skips geocoding entirely and searches that exact point —
// more precise than re-geocoding the typed text.
export async function searchAddress({ query, coords }) {
  const geo = coords || (await geocodeAddress(query));
  if (!geo) return null;
  const spots = await searchParkingRaw({ latitude: geo.lat, longitude: geo.lng });
  if (!spots.length) return null;
  const nearby = spots.filter((s) => haversineMeters(s.latitude, s.longitude, geo.lat, geo.lng) <= NEARBY_METERS);
  const pool = nearby.length ? nearby : [spots[0]];
  return { addressId: encodeAddressKey(pool[0].latitude, pool[0].longitude), address: mapAddressFromSpot(pool[0]) };
}

export async function getSpotsByAddress(addressId) {
  const { lat, lng } = decodeAddressKey(addressId);
  const spots = await searchParkingRaw({ latitude: lat, longitude: lng });
  const nearby = spots.filter((s) => haversineMeters(s.latitude, s.longitude, lat, lng) <= NEARBY_METERS);
  const pool = nearby.length ? nearby : spots.slice(0, 1);
  const address = pool.length
    ? mapAddressFromSpot(pool[0])
    : { id: addressId, line1: "Address", city: "", state: "", zip: "" };
  return { address, spots: pool.map(mapSpot) };
}

export async function getSpot(spotId) {
  const res = await request(`/api/getParkingDetail/${spotId}`);
  if (!res.status) return { spot: null, address: null };
  return { spot: mapSpot(res.data), address: mapAddressFromSpot(res.data) };
}

// For a "Partially Available" window, returns the specific already-booked
// time ranges (in minutes-since-midnight) within it, so the picker can
// block them instead of letting someone double-book an already-rented
// time. Public endpoint, no auth needed. Best-effort: the exact shape of
// what a booking record looks like here hasn't been directly confirmed
// against a live response, so this parses defensively and — if a booking
// entry doesn't look like what's expected — simply skips it rather than
// risk showing wrong blocked ranges.
export async function getBookedRanges(availabilityId) {
  if (!availabilityId) return [];
  let res;
  try {
    res = await request("/api/getBookingsByAvailabilitytId", {
      method: "POST",
      body: { availability_id: availabilityId },
    });
  } catch {
    return [];
  }
  const bookings = Array.isArray(res.data) ? res.data : [];
  const ranges = [];
  for (const booking of bookings) {
    if (booking.status && /cancel/i.test(booking.status)) continue;
    const entries = Array.isArray(booking.slots) && booking.slots.length ? booking.slots : [booking];
    for (const entry of entries) {
      const start = Number(entry.start_date_time);
      const end = Number(entry.end_date_time);
      if (!start || !end) continue;
      const startD = new Date(start);
      const endD = new Date(end);
      ranges.push({
        startMin: startD.getHours() * 60 + startD.getMinutes(),
        endMin: endD.getHours() * 60 + endD.getMinutes(),
      });
    }
  }
  return ranges;
}

export async function signUp({ contact, method, password, name }) {
  const res = await request("/api/signupNew", {
    method: "POST",
    body: {
      type: method,
      name,
      email: method === "email" ? contact : "",
      phone_no: method === "phone" ? toE164(contact) : "",
      password,
      role: "renter",
    },
  });
  // The backend reports "status:false" both for real failures AND for the
  // legitimate "you already have an unverified account" case (returning
  // that account's data instead of an error). Treat the latter as success.
  const data = res.data;
  if (!res.status && !data?._id) {
    throw new Error(messageText(res.message));
  }
  return {
    userId: data._id,
    contact,
    method,
    name,
    verified: false,
    token: data.token || null,
  };
}

export async function signIn({ contact, method, password }) {
  const res = await request("/api/loginNew", {
    method: "POST",
    body: {
      type: method,
      email: method === "email" ? contact : undefined,
      phone_no: method === "phone" ? toE164(contact) : undefined,
      password,
      device_token: "",
      latitude: 0,
      longitude: 0,
    },
  });
  if (!res.status) {
    throw new Error(messageText(res.message));
  }
  const data = res.data;
  return {
    userId: data._id,
    contact,
    method,
    verified: true,
    token: data.token,
  };
}

// verifyOtp doesn't hand back a token. If signup already gave us one
// (brand-new account) we keep it; otherwise (existing-unverified-account
// path) we log in again with the credentials the user just typed, purely
// to obtain a token for the JWT-guarded calls later in checkout.
export async function ensureToken({ token, contact, method, password }) {
  if (token) return token;
  const result = await signIn({ contact, method, password });
  return result.token;
}

export async function verifyCode({ userId, type, code }) {
  const res = await request("/api/verifyOtp", {
    method: "POST",
    body: { user_id: userId, type, otp: Number(code) },
  });
  return { verified: !!res.status };
}

export async function resendCode({ userId, type }) {
  const res = await request("/api/resendOtp", {
    method: "POST",
    body: { user_id: userId, type },
  });
  return { sent: !!res.status };
}

// bookingId must belong to an existing PENDING booking owned by this same
// renter (see createPendingBooking below) — the backend computes the real
// charge amount itself from that booking's records and throws "Pending
// booking not found for this renter" if none exists yet.
export async function createPaymentIntent({ amount, bookingId, token }) {
  const res = await request("/api/payment-sheet", {
    method: "POST",
    body: { amount, booking_id: bookingId },
    token,
  });
  if (!res.status) throw new Error(messageText(res.message));
  return {
    paymentIntentId: res.data.paymentIntentId,
    clientSecret: res.data.paymentIntent,
    publishableKey: res.data.publishableKey,
  };
}

function combineDateTimeToEpoch(dateStr, timeStr) {
  return new Date(`${dateStr}T${timeStr}:00`).getTime();
}

// Creates the booking in PENDING status, before any payment happens. This
// has to run before createPaymentIntent now — the backend's payment-sheet
// route looks up this renter's existing pending booking to determine the
// charge amount and host payout account, rather than trusting whatever the
// client sends.
export async function createPendingBooking({
  token,
  spotId,
  spotSize,
  availabilityId,
  priceType,
  date,
  startTime,
  endTime,
  hours,
  amount,
  name,
  contact,
  method,
  phone,
  carMake,
  carModel,
  vehicleNumber,
}) {
  const startEpoch = combineDateTimeToEpoch(date, startTime);
  const endEpoch = combineDateTimeToEpoch(date, endTime);
  // Phone comes from whichever the user actually provided: their signup
  // contact if they signed up by phone, otherwise the number collected on
  // the profile step.
  const phoneNo = method === "phone" ? contact : phone;
  // The backend formats booking-confirmation text/email times with this
  // (defaulting to UTC if omitted) — send the renter's actual local zone
  // so the times they read match their own clock.
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const res = await request("/api/createBooking", {
    method: "POST",
    body: {
      name,
      email: method === "email" ? contact : "",
      phone_no: Number(phoneNo) || 0,
      address: "",
      car_model: [carMake, carModel].filter(Boolean).join(" "),
      // The website doesn't collect the renter's own vehicle size (the
      // booking form has no such field), so this echoes the spot's own
      // size back. The backend crashes ("SPOT addition failed") if a spot
      // has a size set but the booking's size doesn't resolve to a real
      // Size document — see booking-size-crash-fix.md for the real,
      // backend-side fix (a missing/unmatched size should never crash the
      // whole booking).
      size: spotSize || "",
      vehicle_number: vehicleNumber || "",
      availability_ids: [availabilityId],
      slots: [
        {
          availability_id: availabilityId,
          start_date_time: startEpoch,
          end_date_time: endEpoch,
          amount,
          price_type: priceType || "Hourly",
          total_amount: amount,
          no_of_hours_or_days: hours,
        },
      ],
      spot_id: spotId,
      amount,
      // No real payment has happened yet — the backend's schema requires
      // this field but explicitly allows an empty string. The real Stripe
      // payment intent id is filled in later by confirmBookingPayment.
      transaction_id: "",
      grandTotal: amount,
      timezone,
    },
    token,
  });
  if (!res.status) throw new Error(messageText(res.message));
  const bookingId = (res.data || {})._id || "";
  if (!bookingId) throw new Error("Couldn't reserve this spot. Try again.");
  return { bookingId, spotId, date, startTime, endTime };
}

// Flips a pending booking to Booked once payment has actually succeeded.
// Must match the backend's status enum exactly ('Booked', capitalized) —
// confirmed against src/shared/enums/status.enum.ts in the backend repo. A
// lowercase "booked" silently fails the backend's `status == status.BOOKED`
// check, which also means it skips the renter's booking-confirmation text.
export async function confirmBookingPayment({ token, bookingId, spotId, amount, transactionId, date, startTime, endTime }) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const res = await request("/api/updateBookingStatus", {
    method: "POST",
    body: {
      booking_id: bookingId,
      transaction_id: transactionId,
      status: "Booked",
      spot_id: spotId,
      amount,
      timezone,
    },
    token,
  });
  if (!res.status) throw new Error(messageText(res.message));
  return {
    bookingId,
    confirmationCode: bookingId.slice(-6).toUpperCase(),
    spotId,
    date,
    startTime,
    endTime,
    status: "confirmed",
  };
}

// Best-effort cleanup for a pending booking whose payment never went
// through (card declined, user backed out mid-checkout, a network error) —
// otherwise it's left behind as an orphaned pending row. Never throws; a
// failure here shouldn't block showing the real payment error to the user.
export async function cancelPendingBooking({ token, bookingId, spotId }) {
  try {
    await request("/api/updateBookingStatus", {
      method: "POST",
      body: {
        booking_id: bookingId,
        transaction_id: "",
        status: "Payment Failed",
        spot_id: spotId,
      },
      token,
    });
  } catch (err) {
    console.error("cancelPendingBooking failed:", err);
  }
}

// Strips a stored "+1XXXXXXXXXX" back down to plain digits for display —
// the inverse of toE164() above.
function fromE164(phone) {
  if (!phone) return "";
  return phone.replace(/^\+?1/, "").replace(/\D/g, "").slice(0, 10);
}

export async function getProfile({ token }) {
  const res = await request("/api/getProfile", { token });
  if (!res.status) throw new Error(messageText(res.message));
  const data = res.data || {};
  return {
    name: data.name || "",
    email: data.email || "",
    phone: fromE164(data.phone_no),
  };
}

export async function updateAccountProfile({ token, name, email, phone }) {
  const res = await request("/api/updateProfileAndAddress", {
    method: "POST",
    body: {
      name: name || "",
      email: email || "",
      phone_no: phone ? toE164(phone) : "",
    },
    token,
  });
  if (!res.status) throw new Error(messageText(res.message));
  return { ok: true };
}

export async function changeAccountPassword({ token, oldPassword, newPassword }) {
  const res = await request("/api/changePassword", {
    method: "POST",
    body: { old_password: oldPassword, password: newPassword },
    token,
  });
  if (!res.status) throw new Error(messageText(res.message));
  return { ok: true };
}

// The raw shape of a booking record from getBookingsForRenter hasn't been
// directly confirmed (no source for booking.service.ts), so this reads
// defensively across the field-name variants seen elsewhere in this file
// rather than assuming one — a booking that doesn't match any of them is
// still returned with whatever fields it does have, not dropped.
function mapMyBooking(raw) {
  const slot = Array.isArray(raw.slots) && raw.slots.length ? raw.slots[0] : raw;
  const start = Number(slot.start_date_time) || null;
  const end = Number(slot.end_date_time) || null;
  return {
    id: raw._id,
    spotId: raw.spot_id?._id || raw.spot_id || null,
    spotTitle: raw.spotAddress || raw.spot_id?.description || raw.address || "Parking spot",
    startTime: start,
    endTime: end,
    amount: Number(raw.amount ?? slot.amount ?? 0),
    status: raw.status || "",
    createdAt: raw.meta?.created_at || null,
  };
}

export async function getMyBookings({ token }) {
  const res = await request("/api/getBookingsForRenter", {
    method: "POST",
    body: {},
    token,
  });
  if (!res.status) throw new Error(messageText(res.message));
  const list = Array.isArray(res.data) ? res.data : [];
  return list.map(mapMyBooking);
}

export async function logoutUser({ token }) {
  try {
    await request("/api/logout", { method: "POST", body: {}, token });
  } catch {
    // Client-side logout (clearing the persisted session) still happens
    // regardless — this is best-effort cleanup on the server side only.
  }
}

// The backend's DELETE /api/deleteUser/:id has no auth guard at all (no
// @UseGuards on that route) — anyone who knows a user's id can delete
// their account, not just that user. Flagged to the developer; this is
// called with the signed-in user's own id either way, since it's the only
// account-deletion endpoint that exists.
export async function deleteAccount({ userId, token }) {
  const res = await request(`/api/deleteUser/${userId}`, { method: "DELETE", token });
  if (!res.status) throw new Error(messageText(res.message));
  return { ok: true };
}
