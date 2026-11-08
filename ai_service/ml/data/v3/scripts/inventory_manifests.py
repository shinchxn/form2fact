"""
Form2Fact V3 Manifest Inventory & Cryptographic Checksum Auditor.
Validates that all files registered in manifests/ exist, matches actual disk bytes,
and verifies SHA-256 hashes against stored cryptographic signatures.
"""

import sys
import json
import hashlib
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

def verify_manifests() -> Dict[str, Any]:
    manifest_files = sorted(MANIFESTS_DIR.glob("*.manifest.json"))
    results = []
    all_ok = True
    total_files = 0
    total_records = 0
    total_bytes = 0

    print("=" * 70)
    print(" FORM2FACT V3 — MANIFEST & CRYPTOGRAPHIC INTEGRITY AUDIT")
    print("=" * 70)

    for m_file in manifest_files:
        with open(m_file, "r", encoding="utf-8") as f:
            manifest = json.load(f)

        m_id = manifest.get("dataset_id", m_file.stem)
        m_name = manifest.get("name", m_id)
        files = manifest.get("files", [])
        
        print(f"\nVerifying Manifest: {m_name} ({m_file.name})")
        manifest_clean = True

        for file_info in files:
            total_files += 1
            rel_path = file_info["relative_path"]
            expected_sha = file_info["sha256"]
            expected_bytes = file_info["size_bytes"]
            expected_recs = file_info.get("record_count", 0)

            full_path = RAW_DIR / rel_path
            if not full_path.exists():
                print(f"  ❌ MISSING FILE: {full_path}")
                manifest_clean = False
                all_ok = False
                results.append({
                    "manifest": m_file.name,
                    "file": rel_path,
                    "status": "MISSING",
                    "error": "File does not exist on disk"
                })
                continue

            actual_bytes = full_path.stat().st_size
            if actual_bytes != expected_bytes:
                print(f"  ❌ SIZE MISMATCH: {full_path.name} (Expected {expected_bytes}, got {actual_bytes})")
                manifest_clean = False
                all_ok = False
                results.append({
                    "manifest": m_file.name,
                    "file": rel_path,
                    "status": "SIZE_MISMATCH",
                    "error": f"Size divergence: {actual_bytes} != {expected_bytes}"
                })
                continue

            actual_sha = compute_sha256(full_path)
            if actual_sha != expected_sha:
                print(f"  ❌ CHECKSUM MISMATCH: {full_path.name}")
                manifest_clean = False
                all_ok = False
                results.append({
                    "manifest": m_file.name,
                    "file": rel_path,
                    "status": "CHECKSUM_MISMATCH",
                    "error": f"SHA divergence: {actual_sha} != {expected_sha}"
                })
                continue

            total_bytes += actual_bytes
            total_records += expected_recs
            print(f"  ✅ Verified: {full_path.name} ({actual_bytes:,} bytes, {expected_recs:,} records, SHA: {actual_sha[:16]}...)")
            results.append({
                "manifest": m_file.name,
                "file": rel_path,
                "status": "VERIFIED",
                "size_bytes": actual_bytes,
                "sha256": actual_sha,
                "record_count": expected_recs
            })

    print("\n" + "=" * 70)
    print(f"AUDIT SUMMARY: {'PASS' if all_ok else 'FAIL'}")
    print(f"Total Manifests Verified: {len(manifest_files)}")
    print(f"Total Files Verified: {total_files}")
    print(f"Total Acquired Records: {total_records:,}")
    print(f"Total Disk Footprint: {total_bytes:,} bytes ({total_bytes / (1024*1024):.2f} MB)")
    print("=" * 70)

    return {
        "status": "PASS" if all_ok else "FAIL",
        "total_manifests": len(manifest_files),
        "total_files": total_files,
        "total_records": total_records,
        "total_bytes": total_bytes,
        "results": results
    }

if __name__ == "__main__":
    report = verify_manifests()
    if report["status"] != "PASS":
        sys.exit(1)
