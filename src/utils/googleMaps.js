// Loads the Google Maps JS API (with the Places library, for address
// autocomplete) exactly once, however many components ask for it.

let loadPromise = null;

export function loadGoogleMapsScript() {
  const key = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
  if (!key) {
    return Promise.reject(
      new Error(
        "Address search isn't configured yet — set REACT_APP_GOOGLE_MAPS_API_KEY in .env.local."
      )
    );
  }
  if (window.google?.maps?.places) {
    return Promise.resolve(window.google);
  }
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    // The script file itself can load fine over the network (script.onload
    // fires) even when the API key is rejected (wrong domain/referrer, API
    // not enabled for this key, billing/quota issue) — Google reports that
    // failure separately, via this global callback, rather than as a script
    // load error. Without catching it, a bad key looks "loaded" to us while
    // every actual API call (autocomplete, geocoding) silently breaks.
    window.gm_authFailure = () => {
      loadPromise = null;
      reject(
        new Error(
          "Google Maps rejected this site's API key — check HTTP referrer restrictions, that the Maps JavaScript API and Places API are both enabled for this key, and that billing is active, in Google Cloud Console."
        )
      );
    };
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
    script.async = true;
    script.onload = () => resolve(window.google);
    script.onerror = () => {
      loadPromise = null;
      reject(
        new Error(
          "Couldn't load Google Maps. Check the API key, that the Maps JavaScript API and Places API are enabled, and that this domain is allowed in the key's restrictions."
        )
      );
    };
    document.head.appendChild(script);
  });
  return loadPromise;
}
