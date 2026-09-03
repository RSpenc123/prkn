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
//   POST /api/payment-sheet        JWT      { amount } -> Stripe PaymentIntent (client_secret + publishableKey)
//   POST /api/createBooking        JWT      { name, email, phone_no, car_model, vehicle_number, availability_ids, slots[], spot_id, amount, transaction_id, grandTotal }
//
// Every JWT-guarded route needs `Authorization: Bearer <token>` — the token
// comes back on signupNew (new accounts only) and loginNew. See ensureToken()
// below for the case where signup doesn't hand back a token (an existing,
// not-yet-verified account "failing" signup with that account's data instead).
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
//   - No dedicated UI field exists yet for phone/vehicle plate when signing
//     up by email, so createBooking sends empty/0 for whichever of
//     phone_no / vehicle_number wasn't collected. The backend schema
//     allows this (those fields are optional).

const API_BASE = (process.env.REACT_APP_API_BASE_URL || "").replace(/\/$/, "");
const MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "";
const NEARBY_METERS = 60;

function resolveMediaUrl(path) {
  if (!path) return path;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
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
    };
  });
  return {
    id: raw._id,
    addressId: encodeAddressKey(raw.latitude, raw.longitude),
    title: raw.description ? raw.description.slice(0, 60) : raw.address_line_1 || "Parking spot",
    description: raw.description || "",
    photos: (raw.images || []).map(resolveMediaUrl),
    pricePerHour: Number(raw.price) || 0,
    status: raw.status === "active" && raw.availability_status !== "Fully Booked" ? "available" : "booked",
    availability,
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

async function geocodeAddress(query) {
  if (!MAPS_API_KEY) {
    throw new Error(
      "Address search isn't configured yet — a Google Maps API key (REACT_APP_GOOGLE_MAPS_API_KEY) is needed to turn a typed address into a location."
    );
  }
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
    query
  )}&key=${MAPS_API_KEY}`;
  const res = await fetch(url);
  const json = await res.json();
  if (json.status !== "OK" || !json.results?.length) return null;
  const { lat, lng } = json.results[0].geometry.location;
  return { lat, lng };
}

export async function searchAddress(query) {
  const geo = await geocodeAddress(query);
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

export async function signUp({ contact, method, password, name }) {
  const res = await request("/api/signupNew", {
    method: "POST",
    body: {
      type: method,
      name,
      email: method === "email" ? contact : "",
      phone_no: method === "phone" ? contact : "",
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
      phone_no: method === "phone" ? contact : undefined,
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

export async function createPaymentIntent({ amount, token }) {
  const res = await request("/api/payment-sheet", {
    method: "POST",
    body: { amount },
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

export async function createBooking({
  token,
  spotId,
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
  carMake,
  carModel,
  transactionId,
}) {
  const startEpoch = combineDateTimeToEpoch(date, startTime);
  const endEpoch = combineDateTimeToEpoch(date, endTime);
  const res = await request("/api/createBooking", {
    method: "POST",
    body: {
      name,
      email: method === "email" ? contact : "",
      phone_no: method === "phone" ? Number(contact) || 0 : 0,
      address: "",
      car_model: [carMake, carModel].filter(Boolean).join(" "),
      vehicle_number: "",
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
      transaction_id: transactionId,
      grandTotal: amount,
    },
    token,
  });
  if (!res.status) throw new Error(messageText(res.message));
  const data = res.data || {};
  const bookingId = data._id || "";
  return {
    bookingId,
    confirmationCode: bookingId ? bookingId.slice(-6).toUpperCase() : "CONFIRMED",
    spotId,
    date,
    startTime,
    endTime,
    status: "confirmed",
  };
}
