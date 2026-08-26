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

A QR code on a listed address can link straight to `/r/:addressId`, which shows
every spot at that address and walks the guest through: pick a spot → choose a
date/time → sign up or sign in → verify → enter name/car → pay → confirmation.

Everything currently runs on **mock data and stubbed services** so the whole
flow is clickable with no backend. Here's exactly what's mocked and what's
needed to make it real:

- **`src/api/client.js`** — every function (`getSpotsByAddress`, `signUp`,
  `signIn`, `verifyCode`, `saveProfile`, `createBooking`, etc.) is a stand-in
  for a real API call. Each one has a comment naming the real endpoint it
  represents and its expected request/response shape. Swap the body of each
  function for a `fetch()` against your real API — the rest of the app
  (`src/Pages/Booking/*`) doesn't need to change as long as the shapes match.
- **`src/api/mockData.js`** — fake addresses/spots. The important thing to
  carry over to the real backend: spots need an `addressId` (or similar) field
  so multiple spots at the same address can be grouped and listed together —
  today's spot data doesn't appear to have that grouping.
- **Twilio (SMS verification + confirmation text)** — never call Twilio from
  the browser. `signUp`/`resendCode` should hit your backend, which sends the
  code via Twilio; `verifyCode` should hit your backend, which checks the code
  server-side. Same for the "confirmation text" sent after payment.
- **Stripe (payment)** — never put a Stripe secret key in frontend code. The
  Payment page (`src/Pages/Booking/Payment.js`) currently has stubbed Apple
  Pay/Link/card UI with a "Demo" badge and no real charge. To go live: your
  backend creates a PaymentIntent, the frontend uses Stripe.js/the Payment
  Element to collect and confirm payment client-side, and `createBooking`
  becomes a call that finalizes the booking once payment succeeds (ideally
  driven by a Stripe webhook on the backend, not just the frontend's say-so).
- No live map/geocoding is wired up yet (not needed for the QR flow); Google
  Maps can be added later for a "find a spot near me" page.
