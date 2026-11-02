# Atlanta Cuisine

**Start here for continuation:** read [HANDOFF.md](HANDOFF.md). It records the user's feedback, implementation details, verification limits, asset sources, and the remaining design/motion work. This version is a first draft, not an approved match to the reference.

A responsive static restaurant website inspired by the supplied Palazzo reference, using the original Atlanta Cuisine assets.

## Preview locally

From this folder run:

    node server.mjs

Then open http://localhost:4173. The Node server serves only the public site routes, enforces security headers and limits each direct client IP to a burst of 100 requests, refilling at two requests per second. HOST and PORT can override the listener. These protections run in the server process. For static-only hosting, configure equivalent headers and rate limits at the hosting edge. Behind a reverse proxy, enforce per-client limits at that proxy because the Node server uses the socket peer address.

## Edit

- dist/index.html: page content and contact details
- dist/style.css: visual styling and responsive layout
- dist/app.js: featured dishes and categorized menu prices
- dist/assets: original supplied photos, logo and videos with simplified filenames

Menu prices, phone numbers and hours were transcribed from the supplied menu and opening announcement. Confirm these details before making the website public. Bookings and orders use telephone links; no online reservation or payment service is connected.

Netlify runs `node build.mjs` and publishes `public-build/`. The build fingerprints referenced media for long-lived browser caching and excludes unused originals. Run the build in a fresh checkout to reproduce the deploy.
