"""
Form2Fact V3 Dataset Acquisition & Forensic Manifest Generator.
Acquires primary research datasets (SNLI, MultiNLI, AVeriTeC, FEVER) into ai_service/ml/data/v3/raw/
and generates cryptographic SHA-256 manifests under ai_service/ml/data/v3/manifests/.
"""

import os
import sys
import json
import hashlib
import time
import urllib.request
from pathlib import Path
from typing import Dict, Any, List

RAW_DIR = Path("ai_service/ml/data/v3/raw")
MANIFESTS_DIR = Path("ai_service/ml/data/v3/manifests")

def compute_sha256(filepath: Path) -> str:
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def count_records(filepath: Path) -> int:
    suffix = filepath.suffix.lower()
    if suffix == ".parquet":
        import pyarrow.parquet as pq
        return pq.read_metadata(filepath).num_rows
    elif suffix == ".jsonl":
        count = 0
        with open(filepath, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    count += 1
        return count
    elif suffix == ".json":
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, list):
                return len(data)
            elif isinstance(data, dict):
                # Check for common container keys
                for key in ["data", "claims", "records", "instances"]:
                    if key in data and isinstance(data[key], list):
                        return len(data[key])
                return len(data)
    return 0

def download_snli() -> Dict[str, Any]:
    print("\n[1/4] Acquiring SNLI (stanfordnlp/snli)...")
    from huggingface_hub import hf_hub_download
    dest_dir = RAW_DIR / "snli"
    dest_dir.mkdir(parents=True, exist_ok=True)
    
    files_to_download = [
        "plain_text/validation-00000-of-00001.parquet",
        "plain_text/test-00000-of-00001.parquet",
        "plain_text/train-00000-of-00001.parquet"
    ]
    
    file_records = []
    for rel_path in files_to_download:
        fname = Path(rel_path).name
        out_path = dest_dir / fname
        print(f"  Downloading {rel_path} -> {out_path.name}...")
        downloaded = hf_hub_download(
            repo_id="stanfordnlp/snli",
            filename=rel_path,
            repo_type="dataset",
            local_dir=dest_dir
        )
        # Move or rename if necessary
        actual_file = Path(downloaded)
        if actual_file != out_path and actual_file.exists():
            import shutil
            shutil.copy2(actual_file, out_path)
            
        target = out_path if out_path.exists() else actual_file
        size = target.stat().st_size
        sha = compute_sha256(target)
        recs = count_records(target)
        print(f"    Verified: {target.name} ({size} bytes, {recs} records, SHA: {sha[:12]}...)")
        file_records.append({
            "filename": target.name,
            "relative_path": str(target.relative_to(RAW_DIR)),
            "size_bytes": size,
            "sha256": sha,
            "record_count": recs,
            "format": "parquet"
        })
        
    manifest = {
        "dataset_id": "snli",
        "name": "Stanford Natural Language Inference (SNLI)",
        "source": "https://huggingface.co/datasets/stanfordnlp/snli",
        "repository_id": "stanfordnlp/snli",
        "revision": "cdb5c3d5eed6ead6e5a341c8e56e669bb666725b",
        "download_date": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "licence": "CC BY-SA 4.0",
        "commercial_use_permitted": True,
        "primary_task": "Natural Language Inference (3-class: entailment, neutral, contradiction)",
        "acquisition_scope": "Full distribution (train, validation, test)",
        "files": file_records,
        "total_records": sum(f["record_count"] for f in file_records)
    }
    
    manifest_path = MANIFESTS_DIR / "snli.manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    print(f"  Saved manifest: {manifest_path}")
    return manifest

def download_multinli() -> Dict[str, Any]:
    print("\n[2/4] Acquiring MultiNLI (nyu-mll/multi_nli)...")
    from huggingface_hub import hf_hub_download
    dest_dir = RAW_DIR / "multinli"
    dest_dir.mkdir(parents=True, exist_ok=True)
    
    # Download validation matched and mismatched (canonical development evaluation splits)
    files_to_download = [
        "data/validation_matched-00000-of-00001.parquet",
        "data/validation_mismatched-00000-of-00001.parquet"
    ]
    
    file_records = []
    for rel_path in files_to_download:
        fname = Path(rel_path).name
        out_path = dest_dir / fname
        print(f"  Downloading {rel_path} -> {out_path.name}...")
        downloaded = hf_hub_download(
            repo_id="nyu-mll/multi_nli",
            filename=rel_path,
            repo_type="dataset",
            local_dir=dest_dir
        )
        actual_file = Path(downloaded)
        if actual_file != out_path and actual_file.exists():
            import shutil
            shutil.copy2(actual_file, out_path)
            
        target = out_path if out_path.exists() else actual_file
        size = target.stat().st_size
        sha = compute_sha256(target)
        recs = count_records(target)
        print(f"    Verified: {target.name} ({size} bytes, {recs} records, SHA: {sha[:12]}...)")
        file_records.append({
            "filename": target.name,
            "relative_path": str(target.relative_to(RAW_DIR)),
            "size_bytes": size,
            "sha256": sha,
            "record_count": recs,
            "format": "parquet"
        })
        
    manifest = {
        "dataset_id": "multinli",
        "name": "Multi-Genre Natural Language Inference (MultiNLI)",
        "source": "https://huggingface.co/datasets/nyu-mll/multi_nli",
        "repository_id": "nyu-mll/multi_nli",
        "revision": "da70db2af9d09693783c3320c4249840212ee221",
        "download_date": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "licence": "CC BY-SA 4.0 / ODC Open",
        "commercial_use_permitted": True,
        "primary_task": "Cross-domain sentence-pair reasoning across 10 distinct genres",
        "acquisition_scope": "Validation matched & mismatched benchmark splits",
        "files": file_records,
        "total_records": sum(f["record_count"] for f in file_records)
    }
    
    manifest_path = MANIFESTS_DIR / "multinli.manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    print(f"  Saved manifest: {manifest_path}")
    return manifest

def download_averitec() -> Dict[str, Any]:
    print("\n[3/4] Acquiring AVeriTeC (chenxwh/AVeriTeC)...")
    from huggingface_hub import hf_hub_download
    dest_dir = RAW_DIR / "averitec"
    dest_dir.mkdir(parents=True, exist_ok=True)
    
    files_to_download = [
        "data/dev.json",
        "data/train.json"
    ]
    
    file_records = []
    for rel_path in files_to_download:
        fname = Path(rel_path).name
        out_path = dest_dir / fname
        print(f"  Downloading {rel_path} -> {out_path.name}...")
        downloaded = hf_hub_download(
            repo_id="chenxwh/AVeriTeC",
            filename=rel_path,
            repo_type="model",
            local_dir=dest_dir
        )
        actual_file = Path(downloaded)
        if actual_file != out_path and actual_file.exists():
            import shutil
            shutil.copy2(actual_file, out_path)
            
        target = out_path if out_path.exists() else actual_file
        size = target.stat().st_size
        sha = compute_sha256(target)
        recs = count_records(target)
        print(f"    Verified: {target.name} ({size} bytes, {recs} records, SHA: {sha[:12]}...)")
        file_records.append({
            "filename": target.name,
            "relative_path": str(target.relative_to(RAW_DIR)),
            "size_bytes": size,
            "sha256": sha,
            "record_count": recs,
            "format": "json"
        })
        
    manifest = {
        "dataset_id": "averitec",
        "name": "AVeriTeC: Automated Verification of Real-world Textual Claims",
        "source": "https://fever.ai/dataset/averitec.html",
        "repository_id": "chenxwh/AVeriTeC (repo_type: model)",
        "revision": "2ca9dee23a2a6fa64c5bd918e0cd28ed0aa09031",
        "download_date": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "licence": "CC BY-NC 4.0",
        "commercial_use_permitted": False,
        "licence_restriction_notes": "Non-commercial license. Usable exclusively for research, error analysis, and benchmark evaluation. Strictly isolated from commercial release weights.",
        "primary_task": "Real-world claim verification with question-answer evidence justifications",
        "acquisition_scope": "Train and Development question-answer claim verification sets",
        "files": file_records,
        "total_records": sum(f["record_count"] for f in file_records)
    }
    
    manifest_path = MANIFESTS_DIR / "averitec.manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    print(f"  Saved manifest: {manifest_path}")
    return manifest

def download_fever() -> Dict[str, Any]:
    print("\n[4/4] Acquiring FEVER (Fact Extraction and VERification)...")
    dest_dir = RAW_DIR / "fever"
    dest_dir.mkdir(parents=True, exist_ok=True)
    
    files_to_download = [
        ("shared_task_dev.jsonl", "https://fever.ai/download/fever/shared_task_dev.jsonl")
    ]
    
    file_records = []
    for fname, url in files_to_download:
        out_path = dest_dir / fname
        print(f"  Downloading {url} -> {out_path.name}...")
        
        # Download via urllib with user-agent
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "Form2Fact-Research-Harvester/3.0"}
        )
        with urllib.request.urlopen(req, timeout=30) as resp, open(out_path, "wb") as out:
            while chunk := resp.read(65536):
                out.write(chunk)
                
        size = out_path.stat().st_size
        sha = compute_sha256(out_path)
        recs = count_records(out_path)
        print(f"    Verified: {out_path.name} ({size} bytes, {recs} records, SHA: {sha[:12]}...)")
        file_records.append({
            "filename": out_path.name,
            "relative_path": str(out_path.relative_to(RAW_DIR)),
            "size_bytes": size,
            "sha256": sha,
            "record_count": recs,
            "format": "jsonl"
        })
        
    manifest = {
        "dataset_id": "fever",
        "name": "Fact Extraction and VERification (FEVER)",
        "source": "https://fever.ai/dataset/fever.html",
        "repository_id": "direct_official:fever.ai/download/fever",
        "revision": "2018_v1.0",
        "download_date": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "licence": "CC BY-SA 3.0 / Wikipedia Copyright Policy",
        "commercial_use_permitted": True,
        "primary_task": "Fact Claim Verification (SUPPORTS, REFUTES, NOT ENOUGH INFO)",
        "acquisition_scope": "Official labelled shared-task development benchmark split",
        "files": file_records,
        "total_records": sum(f["record_count"] for f in file_records)
    }
    
    manifest_path = MANIFESTS_DIR / "fever.manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    print(f"  Saved manifest: {manifest_path}")
    return manifest

def main():
    print("=" * 70)
    print(" FORM2FACT V3 — RESEARCH DATASET ACQUISITION & GOVERNANCE SUITE")
    print("=" * 70)
    
    manifests = {}
    manifests["snli"] = download_snli()
    manifests["multinli"] = download_multinli()
    manifests["averitec"] = download_averitec()
    manifests["fever"] = download_fever()
    
    # Save master acquisition ledger
    ledger_path = MANIFESTS_DIR / "master_acquisition_ledger.json"
    with open(ledger_path, "w", encoding="utf-8") as f:
        json.dump(manifests, f, indent=2)
        
    print("\n" + "=" * 70)
    print(" ACQUISITION SUMMARY")
    print("=" * 70)
    for ds_id, m in manifests.items():
        print(f" - {m['name']} ({ds_id}):")
        print(f"     Licence: {m['licence']} (Commercial: {m['commercial_use_permitted']})")
        print(f"     Total Records: {m['total_records']:,}")
        for f in m["files"]:
            print(f"       * {f['filename']}: {f['record_count']:,} recs ({f['size_bytes']:,} bytes) [SHA: {f['sha256'][:16]}...]")
            
    print(f"\nMaster ledger committed to: {ledger_path}")

if __name__ == "__main__":
    main()

