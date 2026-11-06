# Form2Fact — Enterprise Design System Specification

**Design Direction:** Evidence-First Regulatory Intelligence — Professional Institutional Scrutiny Workspace  
**Reference:** F2F-DS-2026  
**Audience:** Frontend Developers, Product Designers, Accessibility Specialists

---

## 1. DESIGN PHILOSOPHY & DIRECTION

Form2Fact is a statutory decision-support platform utilized by institutional scrutiny officers, regulatory auditors, and council chairpersons. Its visual design must convey:
- **Trustworthiness & Objectivity:** The interface must avoid decorative distractions, gimmicky AI gradients, or hyperactive animations.
- **Explainability & Traceability:** Every discrepancy finding and verification status must directly cite its supporting document name, page number, and regulatory clause.
- **Information Density with Breathing Room:** Compact, readable data tables with right-aligned tabular numerals (`tabular-nums`), clean 1px borders, and clear hierarchy.
- **Unambiguous Classification:** Uncertainty (`UNCERTAIN`) must never be conflated with confirmed contradictions (`MISMATCH`).

### Aesthetic Directives:
- **Style:** Precision Enterprise SaaS (akin to modern data auditing tools and regulatory registries).
- **Surface Elevation:** Flat surfaces with crisp 1px borders (`#E2E8F0`) and subtle shadows (`shadow-2xs` / `shadow-xs`).
- **No Neon AI Purples:** Brand accents use institutional Slate/Indigo (`#4F46E5` / `#312E81`), while status colors follow strict semantic conventions.

---

## 2. COLOR PALETTE & TOKEN SPECIFICATION

```
Canvas Background: #F8FAFC (Slate 50)
Card Surface:      #FFFFFF (Pure White)
Subtle Surface:    #F1F5F9 (Slate 100)
Border Crisp:      #E2E8F0 (Slate 200)
Border Focus:      #4F46E5 (Indigo 600)
Text Primary:      #0F172A (Slate 900)
Text Secondary:    #64748B (Slate 500)
Text Muted:        #94A3B8 (Slate 400)
```

### Semantic Five-Class Taxonomy Tokens

| Classification | Meaning | Background | Text | Border | Icon Component |
|---|---|:---:|:---:|:---:|---|
| **`MATCH`** | Concordant values across claim and evidence | `#ECFDF5` | `#065F46` | `#A7F3D0` | `CheckCircle2` |
| **`MISMATCH`** | Verified contradiction or statutory deficit | `#FFF1F2` | `#9F1239` | `#FECDD3` | `XCircle` |
| **`MISSING`** | Mandatory evidence or document omitted | `#FFFBEB` | `#92400E` | `#FDE68A` | `AlertTriangle` |
| **`UNCERTAIN`** | Ambiguous text or degraded OCR requiring human officer review | `#EEF2FF` | `#4F46E5` | `#C7D2FE` | `HelpCircle` |
| **`NOT_COMPARABLE`**| Incompatible dimensions (e.g. date vs area) | `#F8FAFC` | `#64748B` | `#CBD5E1` | `MinusCircle` |

---

## 3. TYPOGRAPHY SCALE & NUMERIC DISCIPLINE

The typography uses the native system font stack anchored by **Inter**, with **JetBrains Mono** for cryptographic hashes, dates, and acreage metrics:

| Role | Font Size | Line Height | Weight | Tracking | Usage |
|---|---|---|---|---|---|
| **H1 Display** | `1.5rem` (24px) | `2.0rem` (32px) | 600 (Semibold) | `-0.025em` | Page header titles |
| **H2 Section** | `1.25rem` (20px) | `1.75rem` (28px) | 600 (Semibold) | `-0.02em` | Section container titles |
| **H3 Card** | `1.0rem` (16px) | `1.5rem` (24px) | 600 (Semibold) | `-0.01em` | Panel titles & modal headers |
| **Body** | `0.875rem` (14px) | `1.375rem` (22px) | 400 (Regular) | `0` | Primary table copy & descriptions |
| **Small / Meta** | `0.75rem` (12px) | `1.125rem` (18px) | 500 (Medium) | `0` | Status badges, timestamps, tags |
| **Numeric Mono** | `0.8125rem` (13px) | `1.25rem` (20px) | 500 (Medium) | `0` | Tabular numbers (`.tabular-nums`) |

---

## 4. COMPONENT SPECIFICATIONS

### 4.1 Buttons
- **Primary:** `bg-[#4F46E5] hover:bg-[#4338CA] text-white px-4 py-2 rounded-md font-medium text-xs shadow-2xs`
- **Secondary / Outline:** `bg-white hover:bg-[#F8FAFC] text-[#0F172A] border border-[#E2E8F0] px-4 py-2 rounded-md font-medium text-xs`
- **Consequential / Danger:** `bg-[#DC2626] hover:bg-[#B91C1C] text-white px-4 py-2 rounded-md font-medium text-xs`
- **Focus Indicator:** All buttons feature `focus-visible:outline-2 focus-visible:outline-[#4F46E5] focus-visible:outline-offset-2`.

### 4.2 Form Controls
- **Inputs & Selects:** Height `38px`, padding `px-3 py-2`, border `border-[#E2E8F0]`, focus ring `focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]`, font size `text-xs`.
- **Labels:** Semibold `text-xs text-[#0F172A] mb-1.5 block`.

### 4.3 Data Tables
- Header row with uppercase text: `text-[11px] font-semibold text-[#64748B] bg-[#F8FAFC] uppercase tracking-wider py-3 px-4 border-b border-[#E2E8F0]`.
- Row hover with pointer affordance: `hover:bg-[#F8FAFC] transition-colors`.
- Numeric cells strictly aligned right with `.tabular-nums`.

### 4.4 Modals & Dialogs
- Backdrop: `bg-slate-900/40 backdrop-blur-xs fixed inset-0 z-50 flex items-center justify-center p-4`.
- Dialog Container: `bg-white rounded-lg border border-[#E2E8F0] shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col`.

---

## 5. RESPONSIVE BREAKPOINTS

- **Desktop ($\ge 1280\text{px}$):** Multi-pane views side-by-side (3-pane review: Navigator 280px + Canvas 1fr + Inspector 340px).
- **Tablet ($768\text{px} - 1279\text{px}$):** Collapsible sidebar, 2-pane review with toggleable evidence drawer.
- **Mobile ($< 768\text{px}$):** Stacked full-width cards, horizontal swipeable tabs, touch targets minimum $44\text{px} \times 44\text{px}$.

---

## 6. ACCESSIBILITY (WCAG 2.2 AA)

1. **Color Contrast:** All body text meets at least $4.5:1$ contrast ratio against backgrounds (`#0F172A` on `#FFFFFF` is $15.8:1$; `#64748B` on `#FFFFFF` is $4.6:1$).
2. **Never Color Alone:** Every status badge combines an SVG icon, explicit text label, and distinct contrast styling.
3. **Keyboard Navigable:** Full Tab key traversal across all forms, tables, modals, and sidebar links with visible focus outlines.
4. **Accessible Dialogs:** Escape key dismisses modals; focus is trapped within active modals.
