# Report Templates (read-only parity reference)

> **Status: retired source.** These JRXML templates and the `template_report_lab.xlsx`
> spreadsheet were copied from the retired `cakramerp-document` service for
> reference only. Document and report generation now runs in-process inside
> `cakramerp-service` (`src/modules/shared/infrastructure/document-generation/`).
> Do not edit these files; treat them as the historical parity record.
>
> - `generated_documents` schema was reused unchanged (no migration needed): it
>   already supports `pending`/`completed`/`failed` status and `error_message`.
> - The spreadsheet-report service (port 8081) had no source in the workspace;
>   its `total`/`sample` endpoints were reconstructed in-house (research R6).
> - To match the legacy output font, drop the four DejaVu Sans TTFs into
>   `src/modules/shared/infrastructure/document-generation/infrastructure/pdf/fonts/`.

---

# Report Templates

All `.jrxml` templates in `src/main/resources/reports/` follow two master styles:

- **Table-master** (15 reports): `finance/`, `laboratory/`, `purchasing/`, `sales/`, `warehouse/` — grid layout with `columnHeader` + `detail` bands, 25pt rows, dark navy column headers (`#2C3E50`/`#FFFFFF`).
- **Form-master** (3 reports): `hr/payslip`, `self-service/` — single-column label/value layout in the `detail` band, thin section dividers.

## Shared Style Tokens

Every template declares these `<style>` elements (injected by `JrxmlNormalizer`):

| Token | Font | Size | Use |
|---|---|---|---|
| `Title` | DejaVu Sans Bold | 18 | Document title |
| `Subtitle` | DejaVu Sans | 12 | Subtitle / doc number |
| `SectionLabel` | DejaVu Sans Bold | 10 | Form section headers, bold labels |
| `Header` | DejaVu Sans Bold | 9 | Table column headers |
| `Body` | DejaVu Sans | 9 | Table cells, form values |
| `Small` | DejaVu Sans | 8 | Footer, small notes |
| `Note` | DejaVu Sans Italic | 7 | Fine-print footer note |

## Normalization Pipeline

Run from `cakramerp-document/`:

```bash
# Preview changes
./gradlew normalizeJrxml --args="--dry-run"

# Apply all fixes
./gradlew normalizeJrxml
```

The pipeline is idempotent — running it a second time produces zero changes.

The Gradle task runs `company.menma.cakramerp_report.util.JrxmlNormalizer`, which:
1. Normalizes margins to 50/50.
2. Injects shared `<style>` definitions.
3. Remaps font sizes to the fixed scale and sets `fontName="DejaVu Sans"`.
4. Assigns `style="Token"` to every element.
5. Fixes table row heights to 25, adds `isStretchWithOverflow` and `verticalAlignment="Middle"`.

## Adding a New Report

1. Create your `.jrxml` from an existing table-master or form-master template.
2. Run `./gradlew normalizeJrxml --args="--dry-run"` to preview changes.
3. Run `./gradlew normalizeJrxml` to apply.
4. Verify with `./gradlew compileJava` (no errors = valid JRXML).
