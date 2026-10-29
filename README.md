# SpecForge — Autonomous Course Specification & Accreditation Engine

SpecForge is an institutional curriculum engine built for Tier-1 autonomous universities to automate course specification ingestion, accreditation validation (NBA SAR / NAAC SSR), and BoS (Board of Studies) governance.

---

## Quickstart & Execution

```bash
# Install dependencies
npm install

# Start the development server (runs full-stack Express + Vite middlewares on Port 3000)
npm run dev

# Or run the production server
npm start
```

### Verification & Testing Commands
```bash
# Run TypeScript compilation checks
npm run typecheck

# Run verification suite
npm run check
npm run verify
```

---

## Core Architecture & Features

### 1. Document Extraction & Ingestion (`POST /api/v1/parse`)
- Accepts `.docx`, `.pdf`, `.html`, and `.doc` files for course specifications (required) and question-paper blueprints (optional).
- Document parsers:
  - **mammoth** for `.docx`
  - **pdf-parse** (v2) for `.pdf`
  - **cheerio** for `.html`
  - **word-extractor** for legacy `.doc`
- Returns validated structured course schema via Zod.

### 2. Template Selection & Cheerio Population (`POST /api/v1/fill-template`)
- **Signal-based detection**:
  - Non-zero Practical credits ($P > 0$) or course category containing `laboratory` $\rightarrow$ **Integrated (Lab)** template.
  - Zero Practical credits $\rightarrow$ **Non-Lab (Theory)** template.
- Populated cleanly with Cheerio, preserving official typography, table structures, and PDF triggers.
- Allows Author manual override with documented rationale.
- Collects official sample strings for leak detection.
- Exportable as self-contained `spec.html`.

### 3. CO–PO–PSO Mapping, Scoring & Justifications (`POST /api/v1/map-copo`)
- Evaluates Course Outcomes (CO1–CO6) against Program Outcomes (PO1–PO12) and Program Specific Outcomes (PSO1–PSO3) loaded from `config/po_pso.json`.
- Scores correlation strengths (`3` Substantial, `2` Moderate, `1` Slight, or null/`-`).
- Produces rigorous one-line justifications for every mapped cell (visible on hover).
- Rewrites a comprehensive course summary covering all syllabus units.
- Author cell-editing with click-cycling (`3` $\rightarrow$ `2` $\rightarrow$ `1` $\rightarrow$ `-`).
- Exports complete Zod-validated `specforge_output.json` (uses input ID `SAMPLE` when sample is loaded).

### 4. Pure-Code Validation Engine V1–V10 (`POST /api/v1/validate-report`)
- Evaluates 10 deterministic statutory rules in pure code (no AI hallucinations):
  - **V1**: Course Code & Descriptors (Section 1)
  - **V2**: Credit Structure Normalization ($L + T + 0.5P$)
  - **V3**: Semester Contact Hours Math (Statutory 15-week term)
  - **V4**: Course Outcomes Count & Bloom Rigor ($4 \le \text{COs} \le 8$, L4–L6 depth)
  - **V5**: Measurable Action Verbs in Outcome Statements (Revised Bloom Taxonomy)
  - **V6**: Modular Syllabus Completeness (4–6 modules with balanced hours)
  - **V7**: Assessment Weightage Exact 100.0% Normalization (CIE + SEE)
  - **V8**: AICTE 2:1 Contact-to-Credit Ratio & Template Conformance
  - **V9**: Articulation Matrix Coverage (zero orphan COs)
  - **V10**: Zero Leftover Template Sample Text / Placeholders
- Grouped by severity (**High**, **Medium**, **Low**) with chosen value, reason, and fix applied.
- Real defects logged in `specforge_output.defects` with defect code, location (`source`: `spec` | `blueprint` | `template`, `section`, `refs`), description, and fix applied.
- Downloadable as self-contained `validation_report.html`.

### 5. 6-State Governance Workflow (`POST /api/v1/workflow/*`)
- **6 Formal States**:
  1. **Draft**
  2. **Submitted**
  3. **Under Review**
  4. **Pending HOD**
  5. **Approved**
  6. **Returned**
- **Strict Role-Based Permissions (HTTP 403 Enforced)**:
  - **Author**: Edits content only in `Draft` or `Returned`. Submits from `Draft` $\rightarrow$ `Submitted`; resubmits from `Returned` $\rightarrow$ `Submitted`.
  - **Reviewer**: Opens from `Submitted` $\rightarrow$ `Under Review`. Forwards from `Under Review` $\rightarrow$ `Pending HOD`, or returns to Author with required comment (`Returned`).
  - **HOD**: Grants final approval from `Pending HOD` $\rightarrow$ `Approved`, or returns with directives (`Returned`).
- **Section Comments**: Reviewers and HODs comment on individual sections (1–12).
- **Draft Watermark**: Prominent **DRAFT** watermark across preview and print views until status is `Approved`.
- **Specs Dashboard**: Live catalog of departmental course specifications with real-time statuses.

### 6. Autonomous End-to-End API (`POST /api/v1/generate`)
- Accepts multipart form-data (`spec` required, `blueprint` optional) with `x-llm-*` headers.
- Runs full ingestion, template detection, population, CO-PO mapping, V1–V10 validation, and output generation without user interaction.
- Returns `{ success: true, data: { output: <specforge_output>, html: <filled HTML> } }`.

### 7. AI Settings & Privacy
- Custom or Gemini AI models configured client-side in the Settings modal (`src/Settings.tsx`).
- Injected via client request headers: `x-llm-provider`, `x-llm-key`, `x-llm-model`.
- Keys are never stored on the server, in database records, or in `.env` files.
