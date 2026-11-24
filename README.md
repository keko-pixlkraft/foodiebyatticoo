# Foodie by Attico · MIZORA

Interactive restaurant presentation with a mobile guest menu, responsive Owner Control and a selection page. Includes the approved MIZORA photographs and branding; Aurel House remains a separate restaurant profile.

## Open the presentation

- Entry: https://foodiebyattico.vercel.app
- Guest View: https://foodiebyattico.vercel.app/guest?restaurant=mizora
- Owner Control: https://foodiebyattico.vercel.app/owner?restaurant=mizora

## Development

Node.js 24, no dependencies or environment secrets required.

~~~powershell
npm.cmd --prefix product run dev
npm.cmd --prefix product run check
npm.cmd --prefix product test
npm.cmd --prefix product run build
npm.cmd --prefix product run test:presentation
~~~

The local editor is at http://127.0.0.1:3000. The static build writes product/dist. Vercel uses the root vercel.json; production builds follow pushes to main. /guest and /owner open the existing application directly. Add restaurant=aurel-house to either route for the reference restaurant. Browser smoke scripts require Chrome on Windows; core tests and the static build use Node.js only.

For online verification, set FOODIE_BASE_URL to the deployment URL before running test:presentation. Other available suites: test:browser, test:owner, test:information.

## Prototype scope

Public, unauthenticated presentation; each browser stores its own edits and cart. No shared backend, real orders, payments or customer accounts. Existing QR destinations are labeled placeholders. Nutrition and possible allergens are illustrative estimates and require restaurant confirmation. Analytics label sample data separately from locally captured interactions. Changes previously made on localhost do not transfer to the public URL automatically.

## Publication boundary

This repository starts from the reviewed current application snapshot. Historical internal documents, customer originals and archival Git history are retained locally. reference/ contains only public image/QR fixtures used for parity checks. Bundled font, flag and QR library licenses are retained beside the assets and vendor files. No open-source license is granted for restaurant photography or branding.
