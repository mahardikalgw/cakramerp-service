# Document fonts

`pdfmake` needs real TrueType font files at runtime. This directory holds the
bundled document font so rendering is self-contained in every environment.

## Bundled font

The four DejaVu Sans faces are committed here and copied into `dist/` by
`nest-cli.json` at build time (`assets` entry for this directory):

- `DejaVuSans.ttf` (normal)
- `DejaVuSans-Bold.ttf` (bold)
- `DejaVuSans-Oblique.ttf` (italics)
- `DejaVuSans-BoldOblique.ttf` (bold italics)

`PdfmakeAdapter` resolves them from this directory and logs
`PDF font provider initialized with "DejaVuSans"`.

DejaVu Sans matches the font the legacy JRXML templates were standardised on, so
in-house PDFs keep the same visual shape as the retired JasperReports output.

## Fallback

If any of the four files is missing, the adapter falls back to the Roboto font
bundled with the installed `pdfmake` package so the service still renders. This
fallback is a safety net only — production images are expected to ship DejaVu.

## Licence

DejaVu fonts are distributed under the Bitstream Vera / DejaVu licence; see
`LICENSE.txt` in this directory.
