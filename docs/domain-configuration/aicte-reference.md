# AICTE Reference Domain Pack Specification

## 1. Domain Pack Identity

- **ID:** `aicte`
- **Name:** AICTE Institutional Approval & Compliance Scrutiny
- **Version:** `1.2.0`
- **Governing Body:** All India Council for Technical Education (Ministry of Education, Govt. of India)
- **Source Location:** `server/domains/aicte/index.ts`

## 2. Statutory Documents (`documentDefinitions`)

| Document Code | Name | Category | Mandatory? | Retention | Allowed MIME |
|---|---|---|---|---|---|
| `DOC-LAND-LEASE` | Registered Land Sale / 30-Year Lease Deed | Land & Infrastructure | **Yes** | 30 Years | `application/pdf` |
| `DOC-BUILDING-PLAN` | Approved Building Plan & Local Authority Sanction | Building & Civil | **Yes** | 30 Years | `application/pdf` |
| `DOC-FIRE-NOC` | Fire & Life Safety Certificate (Competent Authority) | Statutory Safety | **Yes** | 5 Years | `application/pdf` |
| `DOC-STRUCTURE-STAB` | Structural Stability Certificate (Chartered Engineer) | Statutory Safety | **Yes** | 10 Years | `application/pdf` |
| `DOC-SOCIETY-REG` | Society / Trust Registration Certificate | Legal Entity | **Yes** | Indefinite | `application/pdf` |
| `DOC-AFFILIATION-NOC` | State Govt / Affiliating University NOC | Affiliation | **Yes** | 3 Years | `application/pdf` |

## 3. Extracted Canonical Fields (`fieldDefinitions`)

| Field Key | Label | Type | Normalization | Description |
|---|---|---|---|---|
| `lease_expiry_date` | Registered Lease Expiry Date | `date` | `iso_date` | Expiration date of the registered campus land lease deed. |
| `land_area_acres` | Total Contiguous Land Area (Acres) | `number` | `numeric_float` | Declared and verified campus land area in acres. |
| `sponsoring_trust_name`| Sponsoring Trust / Society Entity Name | `string` | `alphanumeric_clean` | Official registered legal entity establishing the technical campus. |
| `fire_noc_validity` | Fire NOC Validity Date | `date` | `iso_date` | Statutory expiration date of the municipal fire safety certificate. |

## 4. Statutory Compliance Rules (`rules`)

### 4.1 RULE-TEN-01: Land Lease Validity & Statutory 30-Year Tenure
- **Category:** Land & Infrastructure
- **Statutory Norm:** The campus land lease deed must possess an unexpired tenure of not less than **30 years** from the date of application submission.
- **Severity:** `Material Discrepancy`
- **Evaluation:**
  - If verified deed expiry date differs from claimed expiry $\rightarrow$ Discrepancy.
  - If unexpired tenure $< 30$ years from scrutiny epoch $\rightarrow$ Discrepancy citing exact year deficit.
  - If supporting registered deed is absent $\rightarrow$ Missing Evidence.

### 4.2 RULE-NAME-02: Institutional Sponsoring Entity Concordance
- **Category:** Legal Entity
- **Statutory Norm:** The sponsoring society/trust named in the application must match the legal grantee/lessee in the registered title deed.
- **Severity:** `Material Discrepancy`
- **Evaluation:**
  - Jaccard similarity $\ge 0.85$ or normalized substring match $\rightarrow$ Pass.
  - Jaccard similarity between $0.20$ and $0.85$ $\rightarrow$ Abstains to `UNCERTAIN` for human reviewer confirmation.
  - Disjoint corporate entity ($< 0.20$) $\rightarrow$ Discrepancy.

### 4.3 RULE-AREA-03: Minimum Campus Land Area (7.50 Acres Standard)
- **Category:** Land & Infrastructure
- **Statutory Norm:** Total verified contiguous land area must meet or exceed the statutory threshold (**7.50 Acres** for standard engineering/technical campuses). Multi-parcel aggregation is permitted across distinct parcels without double-counting duplicate deeds.
- **Severity:** `Critical Deficit`
- **Evaluation:**
  - Sum of distinct verified parcel deeds $< 7.50$ acres $\rightarrow$ Discrepancy stating exact acreage deficit.
  - Duplicate references to the same parcel document are de-duplicated prior to summation.

### 4.4 RULE-DOC-04: Mandatory Fire & Life Safety Certificate
- **Category:** Statutory Safety
- **Statutory Norm:** Valid Fire Safety NOC issued by the competent municipal/state fire authority must be provided.
- **Severity:** `Critical Deficit`

### 4.5 RULE-STAB-05: Certified Structural Stability Certification
- **Category:** Building & Civil
- **Statutory Norm:** Structural stability certificate signed and stamped by an empanelled Chartered Structural Engineer.
- **Severity:** `Material Discrepancy`

### 4.6 RULE-SAFETY-06: Scanned Photocopy OCR & Legibility Quality Guard
- **Category:** Document Integrity
- **Statutory Norm:** Scanned photocopied documents must undergo optical character recognition (OCR) with minimum 60% confidence before automated cross-verification.
- **Severity:** `Administrative Variance`

