# Form2Fact Design System & Component Implementation Guidelines

## 1. Context and Goals

**Design Intent:** Deliver a clean, functional, implementation-oriented design system that enforces deterministic visual consistency, high-density component scalability, and testable WCAG 2.2 AA accessibility across all scrutiny workflows.

### System Scope & Component Density Profile
This specification governs high-density enterprise interfaces with an established baseline footprint of:
- **Cards (`511`)**: High-density record containers, evidence panels, and rule blocks.
- **Buttons (`509`)**: Primary, secondary, and inline scrutiny action triggers.
- **Links (`225`)**: Cross-document citations, page-jump anchors, and breadcrumb trails.
- **Lists (`52`)**: Document inventories, audit ledgers, and validation check queues.
- **Navigation (`5`)**: Primary sidebar, top breadcrumb bar, tab strips, pagination, and document sheet controls.
- **Inputs (`1` primary per filter/search toolbar context)**: Search and structured field correction controls.

Teams must prioritize system consistency over local visual exceptions. Every component implementation must bind strictly to semantic tokens rather than raw hex values or ad-hoc pixel measurements.

---

## 2. Design Tokens and Foundations

All implementations must reference semantic tokens. Raw hex values, arbitrary pixel spacing, and unmapped font sizes are prohibited in component stylesheets.

### 2.1 Typography Tokens
| Semantic Token | Value | Usage Rule |
| :--- | :--- | :--- |
| `font.family.primary` | `Segoe UI Variable Text` | Primary UI typeface for all headings, labels, and controls. |
| `font.family.stack` | `Segoe UI Variable Text, Segoe UI, segoeui, Helvetica Neue, helvetica, arial, sans-serif` | Mandatory fallback stack across all operating systems. |
| `font.size.base` | `16px` | Root document font size (`rem` baseline). |
| `font.weight.base` | `400` | Default body copy and table cell weight. |
| `font.lineHeight.base` | `24px` | Default reading line height (`1.5` ratio). |
| `font.size.xs` | `11px` | Metadata kickers, checksum stamps, and secondary badges. |
| `font.size.sm` | `12px` | Dense table cells, secondary descriptions, and audit timestamps. |
| `font.size.md` | `13px` | Compact button labels, navigation links, and form field labels. |
| `font.size.lg` | `14px` | Primary card body copy and finding explanations. |
| `font.size.xl` | `15px` | Sub-section headers and modal titles. |
| `font.size.2xl` | `16px` | Card titles and primary input text. |
| `font.size.3xl` | `18px` | Section headings and workspace panel titles. |
| `font.size.4xl` | `20px` | Page-level primary headings. |

### 2.2 Semantic Color Tokens
| Semantic Token | Value | Role & Contrast Constraint |
| :--- | :--- | :--- |
| `color.text.primary` | `#0e1726` | Primary foreground copy on `color.surface.strong` (Contrast ratio: `18.1:1`, passes WCAG AAA). |
| `color.text.secondary` | `#616161` | Secondary metadata and supporting labels on `color.surface.strong` (Contrast ratio: `5.9:1`, passes WCAG AA). |
| `color.text.tertiary` | `#051118` | High-emphasis technical identifiers, tabular numerals, and active headers on `color.surface.strong` (Contrast ratio: `19.3:1`). |
| `color.surface.base` | `#000000` | Deepest structural backdrop, modal scrim base, and high-contrast inverse surface. |
| `color.surface.muted` | `#091f2c` | Muted dark structural container and secondary dark navigation surface. |
| `color.surface.raised` | `#06161f` | Elevated dark surface for drawers, popovers, and dark header bars. |
| `color.surface.strong` | `#ffffff` | Primary light content surface for cards, data tables, inputs, and document sheets. |

### 2.3 Spacing Scale Tokens
| Semantic Token | Value | Application |
| :--- | :--- | :--- |
| `space.1` | `0.01px` | Sub-pixel hairline layout containment and optical zero-offset. |
| `space.2` | `1px` | Hairline borders, table cell dividers, and separator lines. |
| `space.3` | `2px` | Focus ring offset (`outline-offset`) and tight inline badge padding. |
| `space.4` | `4px` | Icon-to-label inline gap and compact status tag vertical padding. |
| `space.5` | `6px` | Dense table row vertical padding and compact control group gap. |
| `space.6` | `8px` | Standard button vertical padding, input padding, and card sub-element gap. |
| `space.7` | `10px` | Medium container padding and list item spacing. |
| `space.8` | `12px` | Primary card padding, section gaps, and toolbar horizontal padding. |

### 2.4 Radius and Motion Tokens
| Semantic Token | Value | Usage Rule |
| :--- | :--- | :--- |
| `radius.xs` | `8px` | Standard border radius for cards (`511`), inputs (`1`), and rectangular panels. |
| `radius.sm` | `50px` | Segmented filter controls and pill-shaped action triggers. |
| `radius.md` | `200px` | Full capsule badges and circular icon-only buttons. |
| `motion.duration.instant` | `125ms` | Mandatory transition duration for hover, focus, and active state changes (`opacity`, `transform`, `background-color`). |

---

## 3. Component-Level Rules

Every component must implement explicit styles for all seven interaction states: **default**, **hover**, **focus-visible**, **active**, **disabled**, **loading**, and **error**.

### 3.1 Cards (Page Density: 511)
- **Anatomy**:
  - Outer container (`color.surface.strong`, border `space.2` solid, radius `radius.xs`, padding `space.8`).
  - Header zone (`font.size.2xl` title in `color.text.primary`, optional `font.size.xs` metadata in `color.text.secondary`).
  - Body zone (`font.size.lg` in `color.text.primary`, vertical stack gap `space.6`).
  - Footer action zone (separated by `space.2` divider, top padding `space.6`).
- **Variants**:
  - *Standard Record Card*: Static container on `color.surface.strong`.
  - *Interactive Selection Card*: Clickable card with full-card hit target or primary title link.
  - *Elevated Dark Card*: Uses `color.surface.raised` with `color.surface.strong` text for high-contrast callouts.
- **State Behavior**:
  - `default`: Surface `color.surface.strong`, text `color.text.primary`.
  - `hover` (interactive variant): Transition in `motion.duration.instant` (`125ms`).
  - `focus-visible`: `space.3` (`2px`) solid outline in `color.text.primary` with `space.3` (`2px`) offset.
  - `active`: Subtle scale or border reinforcement within `motion.duration.instant`.
  - `disabled`: Opacity `0.5`, `pointer-events: none`, `aria-disabled="true"`.
  - `loading`: Skeleton placeholder blocks matching exact line heights (`font.lineHeight.base`) with `aria-busy="true"`.
  - `error`: Explicit error header message in `font.size.sm` paired with an alert icon; never rely on border color alone.
- **Interaction & Edge Cases**:
  - *Keyboard*: Interactive cards must be reachable via `Tab` and activated via `Enter` or `Space`.
  - *Pointer/Touch*: Minimum hit target `44px × 44px`.
  - *Long Content & Overflow*: Titles must wrap cleanly or truncate at 2 lines (`line-clamp-2`) with full text accessible in the detail view. Numeric identifiers must use `tabular-nums` and `word-break: break-all` if exceeding container width.
  - *Empty State*: Must display a descriptive message (`font.size.sm`, `color.text.secondary`) explaining why no data is present and providing a recovery action if applicable.

### 3.2 Buttons (Page Density: 509)
- **Anatomy**:
  - Button element (`<button type="button">`), optional leading icon (`space.4` gap), single-line text label (`font.size.md`, `whitespace-nowrap`), optional loading spinner.
  - Padding: Vertical `space.6` (`8px`), Horizontal `space.8` (`12px`).
  - Corner radius: `radius.xs` (`8px`) for standard actions or `radius.sm` (`50px`) for capsule actions.
- **Variants**:
  - *Primary*: Background `color.surface.base` or `color.surface.muted` with `color.surface.strong` text.
  - *Secondary*: Background `color.surface.strong` with `space.2` (`1px`) border in `color.text.secondary` and `color.text.primary` text.
  - *Ghost / Inline*: Transparent background, `color.text.primary` label.
- **State Behavior**:
  - `default`: High-contrast label (`>= 4.5:1`).
  - `hover`: Background shift between `color.surface.base` and `color.surface.muted` over `motion.duration.instant` (`125ms`).
  - `focus-visible`: `space.3` (`2px`) solid outline in `color.text.primary`, `outline-offset: var(--space-3)`.
  - `active`: Pressed state feedback in `motion.duration.instant`.
  - `disabled`: Native `disabled` attribute, cursor `not-allowed`, reduced contrast with `aria-disabled="true"`.
  - `loading`: Preserve button width, render inline spinner (`space.4` gap), set `disabled` and `aria-busy="true"`, update label to present participle (e.g., `"Validating..."`).
  - `error`: Pair retry trigger with explicit inline error status text.
- **Interaction & Edge Cases**:
  - *Keyboard*: Activated by `Enter` or `Space`. Must never trap focus.
  - *Pointer/Touch*: Minimum interactive target area of `44px × 44px` on touch viewports.
  - *Long Content*: Labels must remain single-line (`whitespace-nowrap`) and concise (2–4 words max).

### 3.3 Links (Page Density: 225)
- **Anatomy**:
  - Semantic anchor (`<a href="...">`) or page-reference jump control, text in `font.size.md` or `font.size.sm`, optional trailing directional/external icon (`space.4` gap).
- **Variants**:
  - *Inline Evidence Citation Link*: Underlined by default (`text-decoration: underline`, `text-underline-offset: var(--space-3)`).
  - *Standalone Navigation / Breadcrumb Link*: Clean text in `color.text.secondary`, underlined on hover/focus in `color.text.primary`.
- **State Behavior**:
  - `default`: `color.text.primary` with visible underline when inline.
  - `hover`: `color.text.tertiary` with `space.3` (`2px`) underline thickness in `motion.duration.instant`.
  - `focus-visible`: `space.3` (`2px`) solid focus ring around the full link box.
  - `active`: Immediate visual confirmation on press.
  - `disabled`: Render as `<span>` with `aria-disabled="true"` and `color.text.secondary` when target document is unavailable.
  - `loading`: Inline loading indicator when resolving asynchronous document pages.
  - `error`: Display `(Broken reference — Page unavailable)` inline if target fails to resolve.
- **Interaction & Edge Cases**:
  - *Keyboard*: Activated via `Enter`.
  - *Long Content*: Long filenames in document links must truncate middle or end (`truncate`) while preserving the page number suffix (e.g., `(p. 4)`).

### 3.4 Lists (Page Density: 52)
- **Anatomy**:
  - Semantic list wrapper (`<ul>`, `<ol>`, or `<dl>`), list items (`<li>`) separated by `space.2` (`1px`) dividers or `space.6` (`8px`) vertical gap, internal item padding `space.7` (`10px`) to `space.8` (`12px`).
- **Variants**:
  - *Structured Audit & Findings List*: Multi-column aligned rows with timestamp, actor, and rationale.
  - *Metadata Definition List*: Key-value pairs (`font.size.xs` label in `color.text.secondary`, `font.size.md` value in `color.text.primary`).
- **State Behavior**:
  - Interactive list rows must support `default`, `hover`, `focus-visible`, `active`, `disabled`, `loading` (skeleton rows), and `error` (inline banner with retry button).
- **Responsive & Edge Cases**:
  - On narrow viewports (`< 768px`), horizontal multi-column list items must stack vertically with `space.4` spacing.
  - Empty lists must render a dedicated empty-state block rather than an empty `<ul>` tag.

### 3.5 Navigation (Page Density: 5)
- **Anatomy**:
  - Semantic landmark (`<nav aria-label="...">`), list of navigation items (`font.size.md`, padding `space.6` vertical, `space.8` horizontal, radius `radius.xs`).
- **Variants**:
  - *Primary Left Sidebar*: Vertical list of 8 top-level scrutiny destinations.
  - *Contextual Top Breadcrumb Bar*: Horizontal trail showing hierarchy (`Section > Application ID > Workspace`).
  - *Workspace Tab Strip*: `role="tablist"` switching between Findings, Extracted Fields, Documents, and Audit.
  - *Document Page Navigator*: Previous/Next page stepper (`Page X of Y`).
  - *Filter Segmented Bar*: Status selector controls.
- **State Behavior**:
  - Active item must set `aria-current="page"` (or `aria-selected="true"` for tabs) and display a distinct surface (`color.surface.muted` on dark or inset fill on light) plus `font.weight` increase.
  - All items must implement `hover` (`motion.duration.instant`), `focus-visible` (`space.3` outline), `disabled`, `loading`, and `error` fallback states.
- **Keyboard Behavior**:
  - Sidebar and Breadcrumbs: Standard `Tab` / `Shift+Tab` sequence; `Enter` activates link.
  - Tab Strip: `ArrowLeft` / `ArrowRight` moves focus between tabs; `Home` / `End` jumps to first/last tab.

### 3.6 Inputs (Page Density: 1 Primary Filter/Search Input per Toolbar)
- **Anatomy**:
  - Explicit `<label>` (`font.size.sm`, `color.text.primary`, margin-bottom `space.4`), input field container (`color.surface.strong`, border `space.2` solid `color.text.secondary`, radius `radius.xs`, padding `space.6` vertical, `space.8` horizontal, text `font.size.2xl` / `16px` to prevent mobile zoom), helper/error message slot (`font.size.xs`, margin-top `space.4`).
- **Variants**:
  - *Search Input*: Leading search icon (`space.6` gap) and clear button when populated.
  - *Field Correction Input*: Monospace/tabular input for overriding extracted dates or numeric values.
- **State Behavior**:
  - `default`: Border `color.text.secondary`, surface `color.surface.strong`, text `color.text.primary`.
  - `hover`: Border darkens to `color.text.primary` in `motion.duration.instant`.
  - `focus-visible`: `space.3` (`2px`) solid outline in `color.text.primary`, border `color.text.tertiary`.
  - `active`: Typing state with immediate character feedback.
  - `disabled`: Surface `color.surface.muted` (at 5% tint), `disabled` attribute, `color.text.secondary`.
  - `loading`: Trailing spinner inside input box during asynchronous filter/validation, `aria-busy="true"`.
  - `error`: `aria-invalid="true"`, `aria-describedby` pointing to the error message ID, visible error icon and descriptive message below the input.
- **Keyboard, Pointer & Touch**:
  - Clicking the `<label>` must focus the `<input>`.
  - Pressing `Escape` inside a search input should clear the current query if non-empty.

---

## 4. Accessibility Requirements and Testable Acceptance Criteria

Target compliance: **WCAG 2.2 Level AA**. Every criterion below must be verified via automated tooling and manual keyboard inspection.

| ID | Requirement | Testable Acceptance Criterion (Pass / Fail) |
| :--- | :--- | :--- |
| **A11Y-01** | **Text Contrast** | **Pass:** All primary body text (`color.text.primary` `#0e1726` on `color.surface.strong` `#ffffff`) achieves `>= 4.5:1` contrast (actual `18.1:1`), and secondary text (`color.text.secondary` `#616161` on `#ffffff`) achieves `>= 4.5:1` (actual `5.9:1`).<br>**Fail:** Any text token pairing drops below `4.5:1` (`3:1` for `font.size.3xl` bold and larger). |
| **A11Y-02** | **Focus-Visible Indicator** | **Pass:** Pressing `Tab` across all `509` buttons, `225` links, `5` navigation regions, and `1` input displays an unobstructed `2px` (`space.3`) solid focus ring with `>= 3:1` contrast against adjacent surfaces.<br>**Fail:** Any interactive element has `outline: none` without a replacement `:focus-visible` indicator. |
| **A11Y-03** | **Keyboard-Only Operation** | **Pass:** Every user workflow (Application Intake, Document Page Navigation, Field Correction, Finding Review Decision, Report Export) can be completed using only `Tab`, `Shift+Tab`, `Arrow` keys, `Enter`, `Space`, and `Escape`.<br>**Fail:** Any action requires a mouse hover or pointer click to reveal or trigger. |
| **A11Y-04** | **Modal Focus Management** | **Pass:** Opening a modal (`NewApplicationModal`, `CorrectionModal`, `ReviewActionModal`) moves focus inside the modal, traps `Tab` navigation within the dialog, closes on `Escape`, and restores focus to the triggering button on close.<br>**Fail:** Background page elements remain reachable via `Tab` while a modal is open. |
| **A11Y-05** | **Form & Input Labeling** | **Pass:** Every `<input>`, `<select>`, and `<textarea>` has a programmatically associated `<label>` (via `for`/`id` or wrapping) and links error messages via `aria-describedby` + `aria-invalid="true"`.<br>**Fail:** Inputs rely solely on `placeholder` attributes for labeling. |
| **A11Y-06** | **Non-Color State Signaling** | **Pass:** Every status badge and finding severity indicator pairs color with an explicit text label (e.g., `"Material Discrepancy"`, `"Confirmed"`, `"Scanned Unreadable"`) and/or icon.<br>**Fail:** Status is communicated by a colored dot or border color alone. |
| **A11Y-07** | **Motion Sensitivity** | **Pass:** All state transitions settle within `motion.duration.instant` (`125ms`) and respect `@media (prefers-reduced-motion: reduce)`.<br>**Fail:** Decorative continuous animations or layout-shifting transitions are present. |

---

## 5. Content and Tone Standards

Writing across all interfaces must be **concise, confident, and implementation-focused**. Never use ambiguous labels, speculative accusations, or decorative filler.

| Component Context | Do (Approved Implementation Copy) | Don't (Prohibited Copy) |
| :--- | :--- | :--- |
| **Primary Action Button** | `"Submit & Initiate Scrutiny"` / `"Save Decision & Update Audit"` | `"Click Here"` / `"Go"` / `"Process Magic"` |
| **Destructive / Removal Action** | `"Remove Document from Docket"` | `"Delete"` (ambiguous scope) |
| **Discrepancy Finding Title** | `"Land Lease Expiry Date Variance with Registered Deed"` | `"Fraudulent Lease Detected!"` / `"Bad Date"` |
| **Extraction Uncertainty** | `"Scanned Document — Manual Verification Required"` | `"AI Failed"` / `"Unknown"` |
| **Empty State Copy** | `"No findings match the active status filter. Reset filters to view all 5 docket findings."` | `"Nothing here yet!"` |
| **Input Error Message** | `"Enter a written justification before confirming or dismissing this finding."` | `"Invalid input"` |

---

## 6. Anti-Patterns and Prohibited Implementations

1. **Raw Hex Values in Components**: Components must not hardcode `#0e1726`, `#616161`, or `#ffffff` directly in inline styles when semantic tokens (`color.text.primary`, `color.text.secondary`, `color.surface.strong`) apply.
2. **One-Off Spacing or Typography Exceptions**: Do not invent arbitrary font sizes (e.g., `13.5px`, `17px`) or arbitrary spacing outside `space.1` through `space.8` and standard layout multiples.
3. **Missing Interaction States**: Do not ship any button, card, link, list row, nav item, or input without explicit handling for `default`, `hover`, `focus-visible`, `active`, `disabled`, `loading`, and `error`.
4. **Hidden Focus Outlines**: Never apply `outline: none` or `outline: 0` unless accompanied by a high-contrast `:focus-visible` rule using `space.3` (`2px`).
5. **Ambiguous Action Labels**: Never render icon-only buttons without an explicit `aria-label` and `title` attribute.
6. **Unbounded Card Nesting**: With up to `511` cards across complex views, never nest bordered cards inside bordered cards; use `space.2` (`1px`) hairline dividers and `space.8` (`12px`) padding to segment internal card sections.

---

## 7. QA Checklist

- [ ] **Token Compliance**: All typography, color, spacing, radius, and motion values map to defined semantic tokens (`font.*`, `color.*`, `space.*`, `radius.*`, `motion.duration.instant`).
- [ ] **Typography Scale**: Base font is `Segoe UI Variable Text` at `16px`/`24px` (`400` weight), and all numeric identifiers/dates enforce `tabular-nums`.
- [ ] **Seven-State Completeness**: Every interactive component (`cards`, `buttons`, `links`, `lists`, `navigation`, `inputs`) implements `default`, `hover`, `focus-visible`, `active`, `disabled`, `loading`, and `error` states.
- [ ] **High-Density Performance**: Views scaling to `511` cards, `509` buttons, `225` links, `52` lists, `5` navigation regions, and `1` toolbar search input render without horizontal overflow or layout jitter.
- [ ] **Contrast Verification**: All foreground/background pairs meet or exceed WCAG 2.2 AA (`4.5:1` normal text, `3:1` large text and UI components).
- [ ] **Keyboard & Focus Audit**: Full end-to-end tab order is logical, `:focus-visible` rings are visible on every interactive element, and modals trap and restore focus properly.
- [ ] **Content & Tone Audit**: All labels, empty states, and error messages are concise, specific, and free of ambiguous verbs or unsupported regulatory claims.
