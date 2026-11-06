"""
Autonomous Dataset Discovery, Inspection, and Download Pipeline for Form2Fact V2.
Discovers and acquires candidates from Hugging Face, GitHub, and direct sources.
"""

import os
import sys
import json
import time
import requests
from pathlib import Path
from typing import Dict, Any, List

BASE_DIR = Path("ai_service/ml/data/v2_acquisition")
RAW_DIR = BASE_DIR / "raw"
EXTRACTED_DIR = BASE_DIR / "extracted"
INSPECTED_DIR = BASE_DIR / "inspected"
REPORTS_DIR = BASE_DIR / "reports"

SOURCES_REGISTRY = [
    {
        "id": "snli",
        "name": "Stanford Natural Language Inference (SNLI)",
        "group": "GROUP A: Semantic & NLI",
        "type": "huggingface",
        "repo_id": "stanfordnlp/snli",
        "url": "https://huggingface.co/datasets/stanfordnlp/snli",
        "license": "CC BY-SA 4.0",
        "primary_task": "Natural Language Inference (3-class: entailment, neutral, contradiction)"
    },
    {
        "id": "multi_nli",
        "name": "Multi-Genre Natural Language Inference (MultiNLI)",
        "group": "GROUP A: Semantic & NLI",
        "type": "huggingface",
        "repo_id": "nyu-mll/multi_nli",
        "url": "https://huggingface.co/datasets/nyu-mll/multi_nli",
        "license": "CC BY-SA 4.0 / ODC Open",
        "primary_task": "Multi-Genre Cross-Domain NLI"
    },
    {
        "id": "fever",
        "name": "Fact Extraction and VERification (FEVER)",
        "group": "GROUP A: Semantic & NLI",
        "type": "huggingface",
        "repo_id": "fever/fever",
        "url": "https://huggingface.co/datasets/fever/fever",
        "license": "CC BY-SA 3.0",
        "primary_task": "Fact Claim Verification (SUPPORTS, REFUTES, NOT ENOUGH INFO)"
    },
    {
        "id": "funsd",
        "name": "Form Understanding in Noisy Scanned Documents (FUNSD)",
        "group": "GROUP B: Document & OCR",
        "type": "huggingface",
        "repo_id": "nielsr/funsd",
        "url": "https://guillaumejaume.github.io/FUNSD/",
        "license": "Non-commercial research only",
        "primary_task": "Form understanding, key-value extraction, OCR noisy text"
    },
    {
        "id": "docvqa",
        "name": "Document Visual Question Answering (DocVQA)",
        "group": "GROUP B: Document & OCR",
        "type": "huggingface",
        "repo_id": "vidore/docvqa_train",
        "url": "https://site.docvqa.org/datasets",
        "license": "CC BY 4.0",
        "primary_task": "Visual Document Question Answering"
    },
    {
        "id": "xfund",
        "name": "XFUND Multilingual Form Understanding",
        "group": "GROUP B: Document & OCR",
        "type": "huggingface",
        "repo_id": "nielsr/xfund",
        "url": "https://github.com/doc-analysis/XFUND",
        "license": "Microsoft Research License / ODC",
        "primary_task": "Multilingual Form Understanding & Key-Value extraction"
    },
    {
        "id": "sroie",
        "name": "ICDAR 2019 SROIE (Receipts & Invoices)",
        "group": "GROUP B: Document & OCR",
        "type": "github_direct",
        "url": "https://github.com/zzzDavid/ICDAR-2019-SROIE",
        "license": "Academic / Non-commercial",
        "primary_task": "Receipt / Invoice OCR & Key Information Extraction"
    },
    {
        "id": "cord",
        "name": "CORD: Consolidated Receipt Dataset for Post-OCR Parsing",
        "group": "GROUP B: Document & OCR",
        "type": "huggingface",
        "repo_id": "naver-clova-ix/cord-v2",
        "url": "https://github.com/clovaai/cord",
        "license": "CC BY-NC-ND 4.0",
        "primary_task": "Document Key Information Extraction"
    },
    {
        "id": "deepmatcher",
        "name": "DeepMatcher Entity Matching Benchmark",
        "group": "GROUP C: Entity Matching",
        "type": "direct_url",
        "url": "https://raw.githubusercontent.com/anhaidgroup/deepmatcher/master/Datasets.md",
        "license": "BSD / Academic Open",
        "primary_task": "Entity Matching / Record Linkage (Structured Product & Publication pairs)"
    },
    {
        "id": "wdc_products",
        "name": "Web Data Commons - Product Matching Corpus",
        "group": "GROUP C: Entity Matching",
        "type": "direct_url",
        "url": "https://webdatacommons.org/largescaleproductcorpus/",
        "license": "CC BY-NC 4.0 / Open Access",
        "primary_task": "Attribute-level e-commerce entity matching"
    },
    {
        "id": "opensanctions",
        "name": "OpenSanctions Entity Pairs",
        "group": "GROUP C: Entity Matching",
        "type": "huggingface",
        "repo_id": "sanctions-er-anon/opensanctions_pairs",
        "url": "https://huggingface.co/datasets/sanctions-er-anon/opensanctions_pairs",
        "license": "CC BY 4.0 / OpenSanctions Data License",
        "primary_task": "Entity Resolution / Sanctions entity duplicate pairs"
    }
]

def acquire_datasets():
    print("=" * 70)
    print("FORM2FACT MODEL V2 — AUTONOMOUS DATASET ACQUISITION ENGINE")
    print("=" * 70)

    from datasets import load_dataset

    results = []

    for src in SOURCES_REGISTRY:
        s_id = src["id"]
        s_name = src["name"]
        s_type = src["type"]
        print(f"\n---> [{src['group']}] Processing: {s_name} ({s_id})")

        status_entry = {
            "id": s_id,
            "name": s_name,
            "group": src["group"],
            "license": src["license"],
            "url": src["url"],
            "type": s_type,
            "status": "pending",
            "records_available": 0,
            "sample_records": [],
            "schema_fields": [],
            "original_labels": [],
            "error": None
        }

        if s_type == "huggingface":
            repo_id = src["repo_id"]
            try:
                print(f"Loading metadata / sample from Hugging Face: {repo_id}")
                ds = None
                # Try loading with streaming first to inspect without huge disk load
                try:
                    ds = load_dataset(repo_id, split="train", streaming=True)
                except Exception as e_stream:
                    # Some datasets don't have default config or need subset
                    if s_id == "fever":
                        ds = load_dataset("fever/fever", "v1.0", split="train", streaming=True)
                    elif s_id == "xfund":
                        ds = load_dataset("nielsr/xfund", "xfund.en", split="train", streaming=True)
                    else:
                        raise e_stream

                sample_items = []
                schema_keys = set()
                original_labels = set()
                count = 0

                for item in ds:
                    count += 1
                    for k in item.keys():
                        schema_keys.add(k)
                    if "label" in item:
                        original_labels.add(str(item["label"]))
                    if len(sample_items) < 10:
                        # Convert non-serializable objects (images, etc.) if any
                        clean_item = {}
                        for k, v in item.items():
                            if k in ["image", "pixel_values"]:
                                clean_item[k] = "[IMAGE_BINARY_DATA]"
                            else:
                                clean_item[k] = v
                        sample_items.append(clean_item)
                    if count >= 200:
                        break

                status_entry["status"] = "success"
                status_entry["schema_fields"] = sorted(list(schema_keys))
                status_entry["original_labels"] = sorted(list(original_labels))
                status_entry["records_inspected"] = count
                status_entry["sample_records"] = sample_items

                # Save inspected sample to disk
                sample_file = INSPECTED_DIR / f"samples/{s_id}_sample.json"
                sample_file.parent.mkdir(parents=True, exist_ok=True)
                with open(sample_file, "w", encoding="utf-8") as f:
                    json.dump(sample_items, f, indent=2)

                print(f"  [SUCCESS] Inspected {count} samples. Fields: {status_entry['schema_fields']}")

            except Exception as e:
                err_msg = str(e)
                status_entry["status"] = "failed"
                status_entry["error"] = err_msg
                print(f"  [ERROR] Failed to load {repo_id}: {err_msg}")

        elif s_type in ["github_direct", "direct_url"]:
            try:
                print(f"Checking direct HTTP endpoint: {src['url']}")
                r = requests.get(src['url'], timeout=15)
                if r.status_code == 200:
                    status_entry["status"] = "success"
                    status_entry["http_status"] = r.status_code
                    status_entry["content_length_bytes"] = len(r.content)
                    
                    # Store snippet or sample
                    doc_snippet = r.text[:2000] if "text" in r.headers.get("content-type", "") or src["url"].endswith((".md", ".txt", ".html")) else "[BINARY_CONTENT]"
                    status_entry["snippet"] = doc_snippet
                    sample_file = INSPECTED_DIR / f"samples/{s_id}_info.txt"
                    sample_file.parent.mkdir(parents=True, exist_ok=True)
                    with open(sample_file, "w", encoding="utf-8") as f:
                        f.write(doc_snippet)
                    print(f"  [SUCCESS] HTTP 200 received ({len(r.content)} bytes).")
                else:
                    status_entry["status"] = "http_error"
                    status_entry["error"] = f"HTTP {r.status_code}"
                    print(f"  [HTTP ERROR] Status: {r.status_code}")
            except Exception as e:
                status_entry["status"] = "failed"
                status_entry["error"] = str(e)
                print(f"  [ERROR] {e}")

        results.append(status_entry)

    # Save complete acquisition ledger
    ledger_file = REPORTS_DIR / "acquisition_ledger.json"
    with open(ledger_file, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print(f"\nAcquisition ledger saved to: {ledger_file}")

    return results

if __name__ == "__main__":
    acquire_datasets()

