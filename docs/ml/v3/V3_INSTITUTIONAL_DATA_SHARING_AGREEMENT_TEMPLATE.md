# FORM2FACT V3 — MODEL BILATERAL INSTITUTIONAL DATA-SHARING & RESEARCH PILOT AGREEMENT

**Document Reference:** F2F-V3-AGREEMENT-TEMPLATE-2026  
**Classification:** Legal & Governance Template  
**Applicability:** Engineering Institutions, Technical Universities & Form2Fact Research Project  
**Repository Reference:** `https://github.com/shinchxn/form2fact.git` (`feature/ml-pairwise-classifier-v3`)  

---

## MEMORANDUM OF UNDERSTANDING / DATA-SHARING PILOT AGREEMENT

This Agreement is entered into on this _______ day of ________________, 2026, by and between:

**1. THE PARTICIPATING INSTITUTION:**  
**Name of Institution:** ____________________________________________________________________  
**Permanent AICTE / Affiliation Application ID:** ________________________________________  
**Campus Address:** __________________________________________________________________________  
**Represented by (Head of Institution / Principal / Director):** _____________________________  
*(hereinafter referred to as the **"Participating Institution"**, which expression shall unless repugnant to the context include its successors and permitted assigns)*

AND

**2. THE FORM2FACT RESEARCH PROJECT TEAM:**  
**Project:** Form2Fact — Evidence-First Institutional Document Intelligence Platform  
**Lead Coordinator / Project Investigator:** _________________________________________________  
**Institutional / Organization Affiliation:** ______________________________________________  
**Official Email:** _________________________________________________________________________  
*(hereinafter referred to as the **"Project Team"**, which expression shall unless repugnant to the context include its successors and permitted assigns)*

---

### PREAMBLE

WHEREAS the Participating Institution maintains official regulatory records, land deeds, building approvals, statutory NOCs, and faculty filings for institutional administration and regulatory compliance;

AND WHEREAS the Project Team has developed an evidence-first document intelligence and cross-verification decision-support platform known as **Form2Fact**, designed to assist authorized human reviewers in locating evidence and verifying consistency between declarations and supporting documents;

AND WHEREAS both parties wish to participate in a limited, non-commercial, academic and technical evaluation pilot under strictly auditable and confidential conditions;

NOW, THEREFORE, the Parties agree as follows:

---

### ARTICLE 1: SCOPE, PURPOSE & STRICT NON-STATUTORY NATURE

1.1. **Purpose:** The sole purpose of this Agreement is to evaluate the technical accuracy, traceability, and operational utility of the Form2Fact document intelligence platform across selected institutional document categories.  
1.2. **Decision-Support Only:** The Form2Fact platform functions solely as a human decision-support tool. It possesses no authority to approve, reject, accredit, penalize, or declare the Participating Institution compliant or non-compliant.  
1.3. **No Statutory Representation:** Neither party shall represent that participation in this pilot constitutes official approval, endorsement, accreditation, or formal clearance by the All India Council for Technical Education (AICTE), the Ministry of Education, or any state regulatory council.

---

### ARTICLE 2: APPROVED DOCUMENT CATEGORIES & DATA MINIMIZATION

2.1. **Approved Documents:** The Participating Institution agrees to provide only the specifically enumerated document categories marked below:
- [ ] Category A: Institutional Basic Information & Affiliation Filings (Public / Non-confidential)
- [ ] Category B: Land Ownership / Registered Lease Deeds & Land Conversion Orders
- [ ] Category C: Approved Building Plans & Master Site Plans (Structural / Architectural)
- [ ] Category D: Fire Safety Certificates & Occupancy / Completion Certificates
- [ ] Category E: Faculty Aggregated Summaries (Excluding private contact numbers & salary slips)
- [ ] Category F: Statutory Declarations & Compliance Affidavits

2.2. **Data Minimization & Redaction:** The Participating Institution shall redact or withhold personally identifiable information (PII) of a private nature (including personal Aadhaar numbers, personal bank details, and personal phone numbers) prior to transmission.

---

### ARTICLE 3: DATA OWNERSHIP & PERMITTED USE

3.1. **Ownership Retained:** The Participating Institution retains exclusive ownership, copyright, and control of all original documents and information provided under this Agreement.  
3.2. **Permitted Use:** The Project Team is granted a limited, revocable, non-exclusive license to process, parse, index, and extract text and fields from the documents solely for:
   - Conducting pairwise field cross-verification.
   - Performing double-blind human annotation by authorized reviewers.
   - Compiling technical accuracy and usability evaluation reports.
3.3. **STRICT BAN ON MODEL TRAINING:**  
   **The Project Team expressly warrants that no document, text snippet, or annotation provided by the Participating Institution shall be used to train, fine-tune, or adjust the weights of machine learning models during the pilot without separate, explicit written consent.**

---

### ARTICLE 4: PRIVACY, SECURITY & TENANT ISOLATION

4.1. **Tenant Scoping:** The Project Team will configure an isolated regional organizational tenant (`tenantId`) exclusively dedicated to the Participating Institution. No other institution, commercial third party, or unauthorized user shall have access to the raw documents.  
4.2. **Cryptographic Integrity:** All ingested documents shall be fingerprinted via SHA-256 cryptographic checksums immediately upon receipt. Physical file tampering or modification on disk shall cause immediate quarantine and rejection.  
4.3. **Append-Only Audit Ledger:** All access, viewing, annotation, and adjudication activities shall be recorded in an immutable, cryptographically chained audit ledger, backed by offsite signed checkpoints.

---

### ARTICLE 5: REVIEWER APPOINTMENT & CODE OF CONDUCT

5.1. **Nomination:** The Participating Institution may nominate qualified subject-matter experts (faculty members or academic administrators) to serve as Authorized Reviewers.  
5.2. **Double-Blind Review:** Reviewers shall independently examine candidate pairs without access to other reviewers' annotations.  
5.3. **Conflict of Interest:** No reviewer may evaluate records where an institutional or personal conflict exists, and no reviewer may adjudicate a candidate pair they individually annotated.

---

### ARTICLE 6: RETENTION, DELETION & WITHDRAWAL

6.1. **Duration:** This pilot shall be active for a period of 16 weeks from the date of execution, unless extended by mutual written agreement.  
6.2. **Right of Withdrawal:** The Participating Institution may withdraw from the pilot at any time upon 14 days' written notice.  
6.3. **Purge & Deletion:** Upon conclusion of the pilot or receipt of a written withdrawal notice, the Project Team shall securely delete all raw PDF documents, extracted OCR text, and candidate pairs belonging to the Participating Institution from live staging systems within 30 days, retaining only the cryptographically sealed immutable audit ledger frames as required by forensic governance standards.

---

### SIGNATURES & INSTITUTIONAL SEALS

**For the Participating Institution:**

________________________________________________  
**Authorized Signatory (Name & Title)**  
**Institution:** ________________________________  
**Date:** ______________________________________  
**Institutional Seal:**  

<br><br>

**For the Form2Fact Project Team:**

________________________________________________  
**Lead Coordinator / Project Investigator**  
**Organization / Affiliation:** ________________  
**Date:** ______________________________________  

