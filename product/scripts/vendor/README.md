# QR development tool

`qrcode-generator.cjs` is the unmodified JavaScript distribution of Kazuhiko Arase's QR Code Generator, downloaded from the official repository on 2026-11-23. MIT license: `QR-LICENSE`.

Source: https://github.com/kazuhikoarase/qrcode-generator/tree/master/js/dist

It runs only in the local asset-generation script. It is not served to the application or used through an external API. `npm.cmd run qr:generate` rebuilds the 24 MIZORA SVG files with error-correction level H, a four-module quiet zone and the existing restaurant logo.

`jsQR.cjs` is the unmodified jsQR distribution from the official repository, downloaded on 2026-11-23. It is used only by the Owner browser test to decode rendered SVG codes and the generated PNG download. Source: https://github.com/cozmo/jsQR/tree/master/dist. License: Apache-2.0; see `JSQR-LICENSE`. It is not served with the app.
