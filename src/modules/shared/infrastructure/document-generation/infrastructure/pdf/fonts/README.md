# Document fonts

`pdfmake` needs real TrueType font files at runtime. This directory is the
provisioning point for the document font.

## Current behaviour

The PDF adapter resolves fonts in this order:

1. **DejaVu Sans** – if all of these files exist here:
   - `DejaVuSans.ttf` (normal)
   - `DejaVuSans-Bold.ttf` (bold)
   - `DejaVuSans-Oblique.ttf` (italics)
   - `DejaVuSans-BoldOblique.ttf` (bold italics)
2. **Roboto** – the font bundled with the installed `pdfmake` package
   (`node_modules/pdfmake/fonts/Roboto/`). This is the default fallback so the
   service renders out of the box.

The JRXML templates were standardised on DejaVu Sans, but the confirmed parity
level is "substantially equivalent layout/branding", so Roboto is acceptable.
To match the legacy look exactly, drop the four DejaVu Sans TTFs above into this
directory and restart the service.

## Container note

The Docker image does not install DejaVu by default. If exact parity is needed
in production, copy the TTFs into this directory at build time or mount them.
