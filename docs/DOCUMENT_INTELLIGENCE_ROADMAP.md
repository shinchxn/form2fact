# Form2Fact — Document Intelligence & OCR Architecture Roadmap

This document outlines the technical strategy for advancing Form2Fact from its current deterministic regex pipeline into an enterprise document intelligence and OCR cross-verification platform.

---

## 1. Current State vs. Target State

```
CURRENT STATE (Baseline MVP):
[PDF Buffer] ──► pdf-parse (text stream) ──► Regex Matches ──► 4 Hardcoded Fields
                                              ▲
                                              └── If text < 40 chars ──► Flag "Scanned Unreadable" (No OCR)

TARGET STATE (Production Enterprise):
[PDF / Image]
      │
      ├── Digital PDF? ────► Native Text Stream Extraction (pdf-parse / pdfjs)
      │
      └── Scanned Image? ──► Tesseract.js / Cloud Vision API OCR Worker ──► Dual-Layer Searchable PDF
                                                                                 │
                                                                                 ▼
                                                          AI Layout & Content Document Classifier
                                                                                 │
                                                                                 ▼
                                                      Hybrid Deterministic + Multimodal LLM Extraction
                                                                                 │
                                                                                 ▼
                                                         Full Visual PDF Canvas Viewer + Bounding Boxes
```

---

## 2. Phase 1: Local OCR Engine Integration (`tesseract.js`)

### Objective
Enable automatic digitization of scanned bitmap certificates (Building Safety Certificates, old stamp-paper lease deeds, municipal Fire NOCs) without relying on external cloud APIs.

### Architecture
- **Worker Pipeline:** When `pdf-parse` detects `rawAllText.trim().length < 40`, route the buffer to a background OCR worker.
- **Image Conversion:** Convert PDF pages into high-resolution PNG images (`300 DPI`) using `pdf2pic` or `pdfjs-dist` headless rendering.
- **OCR Processing:** Run `tesseract.js` worker with the `eng` trained data model.
- **Text Layer Synthesis:** Populate `extractedTextByPage` with the OCR-recognized text, calculate character-level confidence scores, and update `processingStatus` to `'Extracted (OCR)'`.

---

## 3. Phase 2: Native Visual PDF Canvas Viewer (`pdfjs-dist`)

### Objective
Replace the mock paper text sheet in `DocumentReviewView.tsx` with a high-fidelity visual PDF canvas renderer so scrutiny officers can visually inspect original stamps, signatures, and seals.

### Technical Blueprint
1. **Frontend Integration:** Install `pdfjs-dist` (or `react-pdf`) to render pages directly to an HTML5 `<canvas>`.
2. **Interactive Bounding Box Overlays:**
   - When structured fields or discrepancy findings are selected in Pane 3 (Evidence Inspector), draw a highlighted SVG/canvas bounding box over the exact physical coordinates on the rendered PDF page.
3. **Zoom & Pan Controls:** Implement fluid GPU-accelerated pinch-to-zoom and pan navigation.

---

## 4. Phase 3: Automated Document Type Classification

### Objective
Eliminate reliance on filename guessing (`file.name.includes('safety')`) or manual user dropdown selection during application intake.

### Technical Blueprint
1. **First-Page Keyword Heuristics:**
   - Scan the first 500 characters of page 1 for statutory anchors:
     - *"INDENTURE OF LEASE"* / *"LESSOR"* / *"LESSEE"* $\rightarrow$ `Land Lease Deed`
     - *"CERTIFICATE OF STRUCTURAL FITNESS"* $\rightarrow$ `Building Safety Certificate`
     - *"FIRE PREVENTION AND LIFE SAFETY"* $\rightarrow$ `Fire Safety NOC`
     - *"BOMBAY PUBLIC TRUSTS ACT"* / *"SOCIETIES REGISTRATION"* $\rightarrow$ `Society / Trust Registration Certificate`
     - *"AICTE APPROVAL ORDER"* $\rightarrow$ `AICTE Prior Approval Order`
2. **Multimodal Classification Fallback:**
   - If keyword heuristics are ambiguous, send the first page image/text to a fast classification model (`gemini-2.0-flash` or a lightweight fine-tuned classifier).
   - Automatically assign the verified `documentType` before running extraction.

---

## 5. Phase 4: Tabular Data Extraction (Cadres & Capacity)

### Objective
Expand beyond scalar strings and dates to audit tabular regulatory schedules:
1. **Faculty Cadre Ratio:** Validate Professor : Associate Professor : Assistant Professor ratios ($1:2:6$) against sanctioned student intake.
2. **Laboratory Equipment Schedules:** Verify minimum mandated test equipment items from attached inspection checklists.
3. **Multi-Parcel Cadastral Schedules:** Automatically extract survey numbers, village names, and sub-district parcel acreage tables into a consolidated spatial matrix.

