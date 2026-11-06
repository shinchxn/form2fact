# Senior UI/UX Audit & Implementation Plan — Form2Fact

## 1. Executive Summary & Design Alignment Goals

Following a comprehensive review of every view, section, table, card grid, and modal in **Form2Fact**, this plan standardizes the entire interface around your selected preferences:

1. **Balanced SaaS Typographic & Spacing Scale**:
   - **Base Body & Table Copy**: `16px` (`1rem`, `leading-6`) for effortless readability during long scrutiny sessions.
   - **Page Titles (`H1`)**: `26px–28px` (`1.625rem–1.75rem`, `font-semibold`, `tracking-tight`).
   - **Section Headers (`H2`)**: `20px` (`1.25rem`, `font-semibold`).
   - **Card & Subsection Titles (`H3`)**: `17px–18px` (`1.0625rem–1.125rem`, `font-semibold`).
   - **Table Headers & Metadata Badges**: `13px–14px` (`0.8125rem–0.875rem`, `font-semibold`, `uppercase tracking-wider` for headers).
   - **Spacious Row & Cell Rhythm**: `16px` (`py-4 px-5`) vertical and horizontal cell padding across all data tables and key-value grids.
2. **Full-Width Fluid Workspace (`max-w-[1440px]`)**:
   - Unify all pages (`Overview`, `Applications`, `Application Detail`, `Findings`, `Rules`, `Reports`, `Audit Log`, `Settings`) to a consistent `max-w-[1440px] mx-auto px-6 lg:px-8` container. This eliminates horizontal layout jumping when switching between pages that previously mixed `max-w-5xl` (`1024px`) and `max-w-6xl` (`1152px`).
3. **Sticky Quick-Jump Topic Bars & Sticky Section Headers**:
   - Pin topic navigation bars (`sticky top-0 z-20 bg-[#F8FAFC]/95 backdrop-blur-md border-b border-[#E2E8F0]`) on scrollable pages so reviewers always see their current section and can jump between topics at any scroll depth without scrolling back to the top.
4. **Fixed Column Widths & Right-Aligned Numeric Columns**:
   - Apply deterministic column width ratios (`table-fixed` / explicit `w-[...]`) and strict right-alignment (`text-right font-mono tabular-nums`) to all quantitative columns (`Land Area`, `Docs`, `Confidence`, `Findings Count`, `Page Numbers`, `Timestamps`).

---

## 2. Typography & Font Size Standardization Matrix

Currently, `index.css` overrides Tailwind's `@theme` scale, while older views (`ReportsView.tsx`, `NewApplicationModal.tsx`, `CorrectionModal.tsx`, `ReviewActionModal.tsx`) still wrap content in `text-xs` or `text-[10px]`/`text-[11px]` classes. We will standardize all components to the following deterministic matrix:

| UI Element | Font Family | Size / Line Height | Weight & Tracking | Color Token |
| :--- | :--- | :--- | :--- | :--- |
| **Page Title (`H1`)** | `Inter` (`--font-sans`) | `28px` / `34px` (`text-2xl`) | `600` (`font-semibold`), `-0.02em` | `#0F172A` |
| **Section Title (`H2`)** | `Inter` (`--font-sans`) | `20px` / `28px` (`text-lg`) | `600` (`font-semibold`), `-0.01em` | `#0F172A` |
| **Card Title (`H3`)** | `Inter` (`--font-sans`) | `18px` / `26px` (`text-base font-semibold`) | `600` (`font-semibold`) | `#0F172A` |
| **Primary Body & Table Cell** | `Inter` (`--font-sans`) | `16px` / `24px` (`text-sm`) | `400` / `500` (`font-normal` / `font-medium`) | `#0F172A` |
| **Secondary Description / Subtitle** | `Inter` (`--font-sans`) | `15px–16px` / `24px` (`text-sm`) | `400` (`font-normal`) | `#64748B` |
| **Table Column Header (`TH`)** | `Inter` (`--font-sans`) | `13px` / `18px` (`text-xs`) | `600` (`font-semibold uppercase tracking-wider`) | `#64748B` |
| **Status & Severity Badges** | `Inter` (`--font-sans`) | `13px` / `18px` (`text-xs`) | `500` (`font-medium`) | Semantic (`#065F46`, `#92400E`, `#9F1239`) |
| **IDs, Metrics, Confidence, Dates** | `JetBrains Mono` (`--font-mono`) | `14px–15px` (`text-xs` / `text-sm`) | `500` (`font-medium tabular-nums`) | `#0F172A` / `#4F46E5` |

---

## 3. Page-by-Page & Section-by-Section UI/UX Audit

### Global Shell: `Sidebar.tsx` & `Header.tsx`
- **Current State**:
  - `Sidebar` (`w-64`) uses a clean 3px left accent bar and pinned footer, and `Header` (`h-14`) renders breadcrumbs and contextual actions.
- **Issues Found**:
  - Header height (`h-14` / `56px`) feels slightly cramped alongside the upgraded `16px` SaaS typography.
  - Breadcrumb separator spacing and active badge alignment can be sharpened.
- **Planned Fixes**:
  - Upgrade `Header` height to `h-16` (`64px`) with `px-6 lg:px-8` horizontal padding aligned to the `1440px` workspace grid.
  - Ensure sidebar navigation items have consistent `py-2.5 px-3.5` hit targets and right-aligned tabular badge counters where relevant.

---

### Page 1: Executive Overview (`OverviewView.tsx`)
- **Sections Reviewed**:
  - Page Header & Topic Quick-Jump Bar
  - `Topic 01 · Summary Metrics` (4-column KPI strip)
  - `Topic 02 · Verification Scenarios` (3-column scenario cards)
  - `Topic 03 · Institutional Applications` (Summary table + View All)
  - `Topic 04 · Priority Findings` (2-column discrepancy cards + View All)
  - `Topic 05 · Active Validation Rules` (3-column rule cards + View All)
  - `Topic 06 · Recent Audit Activity` (Chronological table + View All)
- **Issues Found**:
  1. **Non-Sticky Topic Bar**: When scrolling down to Topics 03–06, the Topic Quick-Jump Bar disappears off-screen, requiring the user to scroll back up to jump to another topic.
  2. **Card Height & Footer Misalignment (Topics 02, 04, 05)**: Scenario cards and Finding cards with 2-line titles push their internal comparison boxes (`Declared Claim` vs. `Document Evidence`) and bottom action bars out of horizontal alignment with adjacent cards in the same row.
  3. **Table Alignment (Topics 03 & 06)**: In Topic 03 (`Applications`), `Land Area` is left-aligned while `Docs` and `Findings` are center-aligned; column widths shift depending on institution name length.
- **Planned Fixes**:
  - Make the **Page Topics Quick-Jump Bar sticky** (`sticky top-0 z-20 -mx-6 px-6 lg:-mx-8 lg:px-8 py-3 bg-[#F8FAFC]/95 backdrop-blur-md border-b border-[#E2E8F0]`) with an active section pill indicator and a "Back to Top" button when scrolled.
  - Enforce CSS Grid `grid-rows-[auto_1fr_auto]` / flex-grow card anatomy on Scenario, Finding, and Rule cards so titles, comparison boxes, and footers align across every row.
  - Convert Topic 03 and Topic 06 tables to deterministic column widths with `py-4 px-5` cell padding and right-aligned numeric columns (`Land Area`, `PDFs`, `Findings`, `Timestamp`).

---

### Page 2: Applications Registry (`ApplicationsView.tsx`)
- **Sections Reviewed**:
  - Page Header & Status Topic Filter Bar (`All Applications`, `Pending Review`, `Under Review`, `Discrepancies Confirmed`, `Review Completed`)
  - Search & Category Filter Toolbar
  - 9-Column Institutional Applications Table
- **Issues Found**:
  1. **Filter Toolbar Wrapping**: Status topic pills and the search/category toolbar sit in two separate boxes that don't stick when scrolling through many applications.
  2. **Table Column Alignment**: `Land Area` is left-aligned, `Docs` and `Findings` are center-aligned, and `Institution` vs. `Location` columns lack explicit width constraints, causing uneven column spacing on wide screens.
- **Planned Fixes**:
  - Combine the Status Topic Bar and Search/Category Filter into a clean, sticky top control header (`sticky top-0 z-20 bg-[#F8FAFC]/95 backdrop-blur-md py-3 border-b border-[#E2E8F0]`).
  - Apply fixed percentage column widths (`w-[12%]` App ID, `w-[22%]` Institution, `w-[13%]` Category, `w-[11%]` Location, `w-[10%]` Land Area right-aligned, `w-[7%]` Docs right-aligned, `w-[8%]` Findings right-aligned, `w-[10%]` Status, `w-[7%]` Action right-aligned) and `py-4 px-5` row padding.

---

### Page 3: Application Inspection Workspace (`ApplicationDetailView.tsx`)
- **Sections Reviewed**:
  - Sticky Breadcrumb & Action Bar (`Re-run Pipeline`, `Deep Scrutiny`, `Dossier`, `Evidence Viewer`)
  - Gemini 3.1 Pro Deep Scrutiny Executive Synthesis Banner
  - Application Metadata Card (Institution Title, Status Badge, 4-Column Key-Value Strip: `Applicant Org`, `State/District`, `Declared Land Area`, `Intake Date`)
  - Topic Switcher Tabs (`All Topics (Scroll View)`, `Findings`, `Extracted Fields`, `Supporting PDFs`, `Audit Trail`)
  - Topic 01: Discrepancy & Verification Findings
  - Topic 02: Extracted Multi-Document Fields Table
  - Topic 03: Supporting PDF Docket Grid
  - Topic 04: Application Audit Trail Table
- **Issues Found**:
  1. **Topic Switcher Not Sticky**: In `All Topics (Scroll View)`, scrolling down through 9 findings and 12 extracted fields loses the Topic Switcher bar.
  2. **Extracted Fields Table Alignment**: The 6 columns (`Field Name`, `Normalized Value`, `Raw Snippet`, `Source Document`, `Confidence`, `Actions`) have unconstrained widths, causing long raw snippets to squeeze the `Field Name` and `Actions` columns. `Confidence` is left-aligned instead of right-aligned.
- **Planned Fixes**:
  - Make the **Topic Switcher & Quick-Jump Bar sticky** at the top of the scroll container so reviewers can switch modes or jump to `Findings`, `Extracted Fields`, `Supporting PDFs`, or `Audit Trail` at any point.
  - Lock column widths on the Extracted Fields table (`w-[18%]` Field Name, `w-[18%]` Normalized Value, `w-[26%]` Raw Snippet, `w-[20%]` Source Document, `w-[10%]` Confidence right-aligned, `w-[8%]` Actions right-aligned) with `py-4 px-5` cell spacing.

---

### Page 4: Evidence Viewer (`DocumentReviewView.tsx`)
- **Sections Reviewed**:
  - Top Document Switcher & Page/Zoom Control Bar
  - Left Pane: Supporting Docket Files List (`lg:w-68`)
  - Center Pane: Interactive Document Page Sheet with Highlighted Evidence Snippets
  - Right Pane: Page-Linked Extracted Fields & Discrepancies Inspector (`lg:w-84`)
- **Issues Found**:
  1. **Typography & Badge Inconsistency**: Several document badges and page buttons still use compact padding and small text relative to the `16px` SaaS standard.
  2. **Sticky Pane Headers**: When scrolling down a long document in the center canvas, the left docket list and right evidence inspector scroll along with the page rather than staying anchored in view.
- **Planned Fixes**:
  - Make the top Document Control Bar sticky (`sticky top-0 z-20`) and use `lg:sticky lg:top-20 lg:self-start` on the Left Docket List and Right Evidence Inspector panes so they remain visible alongside the scrolling document sheet.
  - Add clear right-aligned page badges (`p. 1`, `p. 2`) in monospace numerals across all extracted field cards.

---

### Page 5: Discrepancy Findings Registry (`FindingsView.tsx`)
- **Sections Reviewed**:
  - Page Header & Domain Topic Filter Bar (`All Domains`, `Identity`, `Address & Location`, `Land & Infrastructure`, `Regulatory & Approvals`, `Completeness`)
  - Search, Status, and Severity Filter Bar
  - Findings Card Stream with `Declared Claim` vs. `Document Evidence` side-by-side comparison boxes and Reviewer Resolution Toolbar
- **Issues Found**:
  1. **Non-Sticky Filter Header**: Scrolling through 15+ findings hides the Domain Topic Filter and Search/Severity controls.
  2. **Comparison Grid Alignment**: When a finding only has a single source document vs. two source documents, the height of the `Declared Claim` box and `Document Evidence` box can look unbalanced.
- **Planned Fixes**:
  - Make the Domain Topic Filter + Search/Severity bar sticky at the top of the workspace (`sticky top-0 z-20 bg-[#F8FAFC]/95 backdrop-blur-md py-3 border-b border-[#E2E8F0]`).
  - Use `items-stretch` on the 2-column comparison grid (`Declared Claim` vs. `Document Evidence`) so both boxes always render at equal height with bottom-pinned source citation buttons.

---

### Page 6: Validation Rules Catalog (`RulesView.tsx`)
- **Sections Reviewed**:
  - Page Header & Rule Domain Topic Bar
  - Rule Cards with `role="switch"` Toggle, Logic Description, and 3-Column Metadata Strip (`Rule Type`, `Source Document Scope`, `Failure Action`)
  - Rule Unit Test Suite Section (`8 Deterministic Assertions`)
- **Issues Found**:
  - Container width is currently `max-w-6xl` while adjacent pages vary; unit test cards use slightly tighter padding than the main rule cards.
- **Planned Fixes**:
  - Align to `max-w-[1440px]`, make the Domain Topic Bar sticky, and standardize the 3-column metadata strip and 2-column unit test grid to `p-5` / `py-4 px-5` spacing with right-aligned assertion pass badges.

---

### Page 7: Verification Dossier & Reports (`ReportsView.tsx`)
- **Sections Reviewed**:
  - Application Selector & Export Toolbar (`Export CSV`, `Export JSON`, `Print Dossier`)
  - Printable Dossier Header & Institution Metadata Grid
  - Section 01: Executive Verification Summary (4-column KPI strip)
  - Section 02: Discrepancy & Validation Findings Table
  - Section 03: Extracted Evidence Register Table
  - Section 04: Reviewer Sign-Off & Attestation Block
- **Issues Found**:
  1. **Legacy `text-xs` Wrapper**: `ReportsView.tsx` still has `text-xs` on its root container and `text-[11px]` on several badges and table headers, making it visibly smaller than `OverviewView` and `ApplicationsView`.
  2. **Container Width Mismatch**: Uses `max-w-5xl` (`1024px`) instead of the workspace standard.
  3. **Table Column Alignment**: The Findings table and Extracted Evidence table in the dossier use `py-2.5 px-3` compact padding and lack fixed column widths or right-aligned confidence/page columns.
- **Planned Fixes**:
  - Upgrade `ReportsView.tsx` to `max-w-[1440px]` and remove the root `text-xs` override so body copy renders at `16px` (`text-sm`).
  - Add a **Sticky Dossier Topic & Export Bar** (`01 · Executive Summary`, `02 · Findings Register`, `03 · Extracted Evidence`, `04 · Sign-Off`) so reviewers can jump across the dossier sections.
  - Upgrade both dossier tables to `py-4 px-5` cell padding, deterministic column widths, and right-aligned numeric columns (`Confidence`, `Source Page`).

---

### Page 8: Immutable Audit Trail (`AuditLogView.tsx`)
- **Sections Reviewed**:
  - Page Header & Entity Type Topic Filter Bar (`All Events`, `Application`, `Document`, `Extracted Field`, `Finding`, `Rule`)
  - Search & Total Event Counter Bar
  - 6-Column Chronological Audit Table (`Timestamp`, `Actor`, `Action`, `Entity Type`, `Entity ID`, `Details`)
- **Issues Found**:
  - Entity Filter Bar scrolls out of view on long audit logs; `Timestamp` and `Entity ID` columns lack explicit width constraints, allowing long JSON/text details to compress the first four columns.
- **Planned Fixes**:
  - Make the Entity Topic Filter + Search Bar sticky (`sticky top-0 z-20`).
  - Enforce fixed column widths (`w-[15%]` Timestamp, `w-[13%]` Actor, `w-[15%]` Action, `w-[12%]` Entity Type, `w-[13%]` Entity ID, `w-[32%]` Details) with `py-4 px-5` row padding.

---

### Page 9: System Settings & Architecture (`SettingsView.tsx`)
- **Sections Reviewed**:
  - Section 01: Active Reviewer Persona (`role="radiogroup"` 3-column selector)
  - Section 02: Pipeline Health & Engine Status (Key-value operational table)
  - Section 03: Decision-Support Boundary & Demo Reset
- **Issues Found**:
  - Uses `max-w-5xl` (`1024px`) while other views are wider; the Pipeline Health table uses `col-span-4` / `col-span-5` / `col-span-3` without a table header row.
- **Planned Fixes**:
  - Align container to `max-w-[1440px]`, add a crisp column header row (`Component`, `Specification & Scope`, `Operational Status`) to the Pipeline Health table with `py-4 px-5` row spacing and right-aligned status pills.

---

### Section 10: Interactive Modals (`NewApplicationModal.tsx`, `CorrectionModal.tsx`, `ReviewActionModal.tsx`)
- **Issues Found**:
  - All three modals still have `text-xs` on their outer wrapper and `text-[11px]` on form labels and helper text, making modal forms look noticeably smaller than the main application pages.
- **Planned Fixes**:
  - Upgrade all three modals to the Balanced SaaS typography scale (`20px` modal title, `14px` semibold form labels, `16px` input text with `py-2.5 px-3.5` inputs, and `15px` action buttons).

---

## 4. Phased Implementation Plan

Once you click **Proceed**, we will execute these changes in a clean, verified sequence:

1. **Phase 1 — Global Typography & Layout Tokens (`/src/index.css`, `/src/components/Header.tsx`, `/src/components/Sidebar.tsx`)**:
   - Calibrate the `@theme` font-size and line-height tokens to the exact Balanced SaaS scale (`16px` body, `28px` page titles, `20px` section titles, `14px` table headers/badges).
   - Add reusable utility classes for sticky topic bars and standardized `max-w-[1440px]` containers.
2. **Phase 2 — Sticky Topic Bars & Fixed-Width Right-Aligned Tables (`/src/components/OverviewView.tsx`, `/src/components/ApplicationsView.tsx`, `/src/components/ApplicationDetailView.tsx`)**:
   - Add sticky behavior to the Topic Quick-Jump bars on `OverviewView`, `ApplicationsView`, and `ApplicationDetailView`.
   - Enforce `table-fixed` / deterministic column percentages, `py-4 px-5` (`16px`) vertical row padding, equal-height card grids, and right-aligned numeric columns (`Land Area`, `PDFs`, `Findings`, `Confidence`).
3. **Phase 3 — Secondary Workspace Views (`/src/components/FindingsView.tsx`, `/src/components/RulesView.tsx`, `/src/components/ReportsView.tsx`, `/src/components/AuditLogView.tsx`, `/src/components/SettingsView.tsx`, `/src/components/DocumentReviewView.tsx`)**:
   - Upgrade `ReportsView` from `text-xs` / `max-w-5xl` to the full `16px` SaaS typography scale and `max-w-[1440px]` container with a sticky section jump bar.
   - Make filter/topic bars sticky on `FindingsView`, `RulesView`, and `AuditLogView`, and anchor panes in `DocumentReviewView`.
4. **Phase 4 — Modal Typography & Spacing Alignment (`/src/components/NewApplicationModal.tsx`, `/src/components/CorrectionModal.tsx`, `/src/components/ReviewActionModal.tsx`)**:
   - Remove legacy `text-xs` wrappers and align all form inputs, labels, and action footers to the `16px` Balanced SaaS scale.
5. **Phase 5 — Build & Type Verification**:
   - Run `lint_applet` and `compile_applet` to verify zero TypeScript or CSS build issues.
