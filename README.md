# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)

## Web rental flow (`/r/:addressId`)

A QR code on a listed address (or the address search box on the landing page)
links to `/r/:addressId`, which shows every spot at that address and walks the
guest through: pick a spot → choose a date/time → sign up or sign in → verify
→ enter name/car → pay → confirmation.

### Mock mode vs. real backend

By default (no env vars set) the whole flow runs on **mock data** — nothing
talks to a real server, so it's clickable with zero setup. Set
`REACT_APP_API_BASE_URL` (see below) and it switches to the **real backend**
at [omkar-nanda-ditstek/parking-slot](https://github.com/omkar-nanda-ditstek/parking-slot)
instead. This is a hard switch, not a per-call fallback:

- `src/api/mockClient.js` — the fake implementations (unchanged, still used when no env var is set)
- `src/api/realClient.js` — real `fetch()` calls to the actual API, with the exact route contract documented at the top of the file (verified by reading that backend's source, not guessed)
- `src/api/client.js` — picks one of the above based on `REACT_APP_API_BASE_URL`

`src/Pages/Booking/*` and `src/components/AddressSearch.js` call the same
function names (`getSpotsByAddress`, `signUp`, `createBooking`, etc.)
regardless of which mode is active.

### Environment variables needed to go live

Create `.env.local` in the project root (already gitignored — never commit
real values) with:

```
REACT_APP_API_BASE_URL=https://your-backend-domain.example.com
REACT_APP_GOOGLE_MAPS_API_KEY=your-browser-restricted-maps-key
```

- **`REACT_APP_API_BASE_URL`** — the backend's base URL. **Must be HTTPS** if
  the website itself is served over HTTPS (a browser blocks a plain-HTTP API
  call from an HTTPS page — "mixed content"). The backend was last known to
  run on plain HTTP at a raw IP; that needs a domain + TLS certificate before
  this can point at it in production.
- **`REACT_APP_GOOGLE_MAPS_API_KEY`** — a **separate, browser-restricted**
  Google Maps API key, HTTP referrer restricted to your domain (add
  `localhost/*` too for local testing). Do not reuse the backend's own
  `GOOGLE_MAP_KEY` — that one is a server-side secret and must never end up
  in frontend code, which anyone can read.
  Enable, and check under the key's **API restrictions**, all three of:
  **Maps JavaScript API**, **Places API**, **Geocoding API**. All three are
  used through the JS SDK (loaded via `<script>`) rather than any raw REST
  call — a referrer-restricted key is *rejected outright* by Google's raw
  Geocoding REST endpoint ("API keys with referer restrictions cannot be
  used with this API"), so everything here goes through
  `google.maps.places.Autocomplete` / `google.maps.Geocoder` instead, which
  referrer restrictions are actually designed for.
- Stripe needs no frontend env var — `payment-sheet` returns a
  `publishableKey` in its response, so the frontend picks it up dynamically.

### CORS

The backend must allow requests from wherever this site is hosted (its
`main.ts` needs your site's origin in `enableCors()`). This can't be tested
from a sandboxed environment with no network access to that server — if you
see a CORS error in the browser console once this is running for real,
that's the fix, on the backend side.

### Known simplifications (see comments in `realClient.js` for detail)

- **Address grouping is synthesized, not native.** The real Spot schema has
  no separate "address" record — each spot just carries its own
  `address_line_1`/`city`/`latitude`/`longitude` fields. "Spots at this
  address" here means "spots within ~60m of a geocoded point," and the
  `addressId` in the URL is a lat/lng pair we encode ourselves, not a real
  database ID.
- **Pricing markup may not match exactly.** `searchParking` applies a host
  +admin+renter fee stack via the backend's `calculateAmount()`; the
  spot-detail page (`getParkingDetail`) does not. Card prices and the detail
  page's price can legitimately disagree until that's reconciled.
- **OTP verification doesn't return a token.** After a successful
  `verifyOtp`, the app silently re-logs-in with the password the user just
  typed (kept briefly in memory/sessionStorage, never sent anywhere except
  that one call) purely to obtain a JWT for the payment/booking steps.
