# Form2Fact Model V2 — Dataset Download & Inspection Report

**Pipeline Execution:** `acquire_datasets.py`  
**Inspected Directory:** `ai_service/ml/data/v2_acquisition/inspected/samples/`

---

## 1. Download & Inspection Inventory

| Dataset Identifier | Download Strategy | Disk Location | Sample Count Stored | Schema / Key Attributes |
|:---|:---|:---|---:|:---|
| `snli` | Hugging Face Streaming | `inspected/samples/snli_sample.json` | 10 records (200 inspected) | `premise`, `hypothesis`, `label` |
| `multi_nli` | Hugging Face Streaming | `inspected/samples/multi_nli_sample.json` | 10 records (200 inspected) | `pairID`, `premise`, `hypothesis`, `genre`, `label` |
| `funsd` | Hugging Face Streaming | `inspected/samples/funsd_sample.json` | 10 records (149 inspected) | `id`, `words`, `bboxes`, `ner_tags` |
| `docvqa` | Hugging Face Streaming | `inspected/samples/docvqa_sample.json` | 10 records (200 inspected) | `query`, `answer`, `source` |
| `cord` | Hugging Face Streaming | `inspected/samples/cord_sample.json` | 10 records (200 inspected) | `ground_truth` |
| `sroie` | Direct HTTP Inspection | `inspected/samples/sroie_info.txt` | 1 manifest snippet | Repository manifest and dataset guidelines |
| `deepmatcher` | Direct HTTP Inspection | `inspected/samples/deepmatcher_info.txt` | 1 benchmark table | Public attribute linkage tables |
| `wdc_products` | Direct HTTP Inspection | `inspected/samples/wdc_products_info.txt` | 1 dataset index | Web Data Commons corpus metadata |

---

## 2. Blocked Sources Requiring User Action
- **`opensanctions_pairs`:** Returns HTTP 403 / Gated dataset on Hugging Face (`sanctions-er-anon/opensanctions_pairs`).
  - **Action Required:** If access is desired, log in via Hugging Face web interface and accept the gated dataset terms, or pass a configured `HF_TOKEN`.
- **`fever/fever`:** Hugging Face 5.x disallows legacy arbitrary dataset loading scripts (`fever.py`).
  - **Resolution:** Can be ingested via the raw research download archive (`https://fever.ai/resources.html`) or converted to Parquet.
