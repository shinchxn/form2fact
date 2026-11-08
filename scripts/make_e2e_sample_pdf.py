"""
Generates a SYNTHETIC lease-deed PDF for E2E validation.

The document is entirely fictional (explicitly marked) and crafted so that
Form2Fact's deterministic extraction pipeline has unambiguous targets:
  - "total land area admeasuring 9.2 Acres"  -> landAreaAcres extraction
  - "expiring on 31/03/2035"                 -> leaseExpiryDate extraction

Used by scripts/e2e-validation.mjs. Output: sample_documents/E2E_Synthetic_Lease_Deed.pdf
"""
import os
import sys

try:
    import fitz  # PyMuPDF
except ImportError:
    print("PyMuPDF (fitz) is required: pip install PyMuPDF")
    sys.exit(1)

TEXT = """SYNTHETIC SAMPLE DOCUMENT - GENERATED FOR AUTOMATED E2E TESTING
This instrument is entirely fictional. It references no real persons,
institutions, or land parcels.

THE LEASE DEED (SYNTHETIC)

This lease deed is made in respect of the campus premises described in this
schedule. The lessor hereby demises to the lessee the campus premises with a
total land area admeasuring 9.2 Acres, situated at Plot 7, Knowledge Park,
Bengaluru, Karnataka - 560001.

The present lease arrangement is valid up to 31/03/2035, and this instrument
is expiring on 31/03/2035 unless renewed by mutual written consent of both
parties.

The lessee shall use the demised premises exclusively for educational
purposes.

Signed and sealed on this 12th day of January, 2026 at Bengaluru.
"""

def main() -> None:
    out = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                       "sample_documents", "E2E_Synthetic_Lease_Deed.pdf")
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((72, 100), TEXT, fontsize=11, fontname="helv")
    doc.save(out)
    doc.close()

    # Self-verification: re-open and confirm the extractable text layer
    recheck = fitz.open(out)
    t = " ".join(recheck[0].get_text().split())
    recheck.close()
    assert "area admeasuring 9.2 Acres" in t, "area line missing from text layer"
    assert "expiring on 31/03/2035" in t, "expiry line missing from text layer"
    print(f"OK: wrote {out} ({os.path.getsize(out)} bytes, {len(t)} chars of extractable text)")

if __name__ == "__main__":
    main()
