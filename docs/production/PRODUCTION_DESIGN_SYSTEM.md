# Form2Fact Enterprise Design System Specification

**Document ID:** `FORM2FACT-DESIGN-SYSTEM-001`  
**Date:** November 6, 2026  
**Auditor:** Senior Product Designer, Enterprise UX/UI Architect & Accessibility Lead  
**Repository:** `https://github.com/shinchxn/form2fact.git`  
**Branch:** `feature/production-transformation-ui`

---

## 1. Brand Identity & Visual Language

Form2Fact is an authoritative institutional compliance platform built for rigorous regulatory scrutiny. Its visual system communicates **institutional trust, auditability, precision, and operational clarity**.

### Official Brandmark
- **Logo Symbol:** Folded statutory document emblem integrated with "F2F" ligature and verification checkmark.
- **Brand Colors:** Deep Institutional Navy (`#0A2540` / `#002B49`) paired with Verifiable Evidence Teal (`#0D9488` / `#00A3A6`).
- **Tagline:** *"From Institutional Claims to Verifiable Evidence."*

---

## 2. Color Tokens

### 2.1 Core Neutral & Canvas Palette
```css
--bg-canvas: #F8FAFC;         /* Soft slate canvas background */
--surface-card: #FFFFFF;      /* Clean crisp white surface */
--surface-subtle: #F1F5F9;    /* Secondary container surface */
--surface-hover: #F8FAFC;     /* Interactive table row hover */
--border-crisp: #E2E8F0;      /* Standard 1px high-precision border */
--border-strong: #CBD5E1;     /* Focus and active border */
--text-primary: #0F172A;      /* High-contrast body text (14.2:1 contrast) */
--text-secondary: #475569;    /* Legible secondary metadata (7.4:1 contrast) */
--text-muted: #64748B;        /* Tertiary labels and timestamps (4.8:1 contrast) */
```

### 2.2 Brand & Action Tokens
```css
--brand-navy: #0A2540;        /* Deep institutional navy (Primary brand) */
--brand-navy-hover: #071A2E;  /* Navy button active state */
--brand-teal: #0D9488;        /* Evidence teal accent */
--brand-teal-hover: #0F766E;  /* Teal hover state */
--brand-teal-tint: #F0FDFA;   /* Subtle teal card background */
--brand-teal-border: #99F6E4; /* Teal accent border */
```

### 2.3 Regulatory Classification Semantics (5-Class Taxonomy)
| Classification | Meaning | Background | Text Color | Border Color | Accessible Label |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **MATCH** | Evidenced Concordance | `#ECFDF5` | `#065F46` | `#A7F3D0` | Concordant with documentary evidence |
| **MISMATCH** | Contradiction Detected | `#FFF1F2` | `#9F1239` | `#FECDD3` | Discrepancy requiring human review |
| **MISSING** | Required Evidence Omitted | `#FFFBEB` | `#92400E` | `#FDE68A` | Missing statutory evidence |
| **UNCERTAIN** | Low Posterior Confidence ($< 0.60$) | `#FFF7ED` | `#C2410C` | `#FED7AA` | Ambiguous; routed to officer review |
| **NOT_COMPARABLE** | Incompatible Dimensions | `#F8FAFC` | `#475569` | `#CBD5E1` | Semantically non-comparable fields |

> **GOVERNANCE RULE:** Green (`MATCH`) denotes verified data concordance only. It must NEVER imply automated regulatory approval of an institutional application.

---

## 3. Typography Hierarchy

The platform uses a clean system font stack prioritizing **Inter** with fallbacks to system typography (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`).

| Element | Size | Weight | Line Height | Usage |
| :--- | :---: | :---: | :---: | :--- |
| **Display / Metric** | `28px` (`1.75rem`) | `600` (SemiBold) | `36px` | Dashboard KPI metrics (tabular nums) |
| **Page Title (H1)** | `22px` (`1.375rem`) | `600` (SemiBold) | `28px` | View headers & workspace titles |
| **Section Title (H2)** | `18px` (`1.125rem`) | `600` (SemiBold) | `24px` | Topic dividers & modal headings |
| **Card / Subheading (H3)**| `15px` (`0.9375rem`) | `600` (SemiBold) | `22px` | Table headers & card titles |
| **Primary Body** | `14px` (`0.875rem`) | `400` (Regular) | `20px` | Table rows, extracted field text |
| **Secondary Metadata** | `13px` (`0.8125rem`) | `500` (Medium) | `18px` | Badges, citations, timestamps |
| **Monospace / Code** | `12px` (`0.75rem`) | `500` (Medium) | `16px` | Reference numbers, SHA-256 hashes |

---

## 4. Reusable Component Specifications

1. **Application Shell:**
   - Left Sidebar: Deep navy or crisp white with navy brand header, official Form2Fact logo, grouped navigation (Workspace vs Governance), and active border indicator.
   - Top Header: Breadcrumb trail, institutional context, role indicator, and quick actions.
2. **Data Tables:**
   - Sticky header with subtle border.
   - Column sorting indicators.
   - Accessible row hover states.
   - Strict `tabular-nums` for acreage, dates, and reference numbers.
3. **Evidence Split Viewer:**
   - 3-pane layout: Document selector (left), Document Canvas (center), Extracted Fields & Findings (right).
   - High-contrast citations and page links.
4. **Skeleton Loaders:**
   - Layout-preserving pulsing rectangles (`animate-pulse`) for KPI cards, table rows, and PDF previews.
5. **Truthful Empty States:**
   - Iconography, explanatory message, and contextual primary CTA (e.g. "Create New Application").

---

## 5. Accessibility Mandates (WCAG 2.2 AA)

- **Focus Rings:** Visible focus indicator with `outline: 2px solid #0D9488; outline-offset: 2px;` on all interactive controls.
- **Color Contrast:** All body text $\ge 4.5:1$; all headers $\ge 3:1$.
- **Non-Color Indicators:** All status badges pair color with text labels and Lucide SVG icons (`CheckCircle`, `AlertTriangle`, `HelpCircle`, `XCircle`).
