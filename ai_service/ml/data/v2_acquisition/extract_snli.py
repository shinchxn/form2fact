"""
Form2Fact Public Dataset Mapping: SNLI Entailment & Contradiction Extractor.
Extracts clean, permissively licenced sentence pairs mapped conservatively to MATCH and MISMATCH.
Saves to ai_service/ml/data/v2_acquisition/processed/snli_mapped_candidates.jsonl
"""

import json
from pathlib import Path
from datasets import load_dataset

OUT_FILE = Path("ai_service/ml/data/v2_acquisition/processed/snli_mapped_candidates.jsonl")

def extract_snli_mapped(max_samples=200):
    print(f"Extracting {max_samples} SNLI mapped samples from Hugging Face...")
    ds = load_dataset("stanfordnlp/snli", split="train", streaming=True)
    
    extracted = []
    count = 0
    
    for item in ds:
        lbl = item["label"]
        if lbl == 0:
            target_lbl = "MATCH"
            rationale = "SNLI textual entailment: Evidence premise logically entails claim hypothesis."
        elif lbl == 2:
            target_lbl = "MISMATCH"
            rationale = "SNLI textual contradiction: Evidence premise contradicts claim hypothesis."
        else:
            continue # Skip neutral
            
        rec = {
            "pair_id": f"snli-{count:05d}",
            "domain": "general_nlp",
            "field_name": "generalStatement",
            "field_type": "generic",
            "claim": {
                "raw_value": item["hypothesis"],
                "context": "Hypothesis claim statement",
                "document_type": "public_claim",
                "extraction_confidence": 1.0
            },
            "evidence": {
                "raw_value": item["premise"],
                "context": "Ground truth premise evidence",
                "document_type": "public_premise",
                "extraction_confidence": 1.0
            },
            "label": target_lbl,
            "original_label": "entailment" if lbl == 0 else "contradiction",
            "data_origin": "snli_public_augmentation",
            "reviewer_rationale": rationale,
            "annotation_status": "defensibly_mapped"
        }
        extracted.append(rec)
        count += 1
        if count >= max_samples:
            break
            
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        for r in extracted:
            f.write(json.dumps(r) + "\n")
            
    print(f"Saved {len(extracted)} defensibly mapped SNLI records to: {OUT_FILE}")

if __name__ == "__main__":
    extract_snli_mapped(200)

