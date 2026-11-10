import json
import re
import time
import os
import sys
from collections import Counter
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from ai_service.app.schemas import (
    PairwiseRequest, PairwiseResponse, PairwiseLabel,
    FieldCandidate
)
from ai_service.app.classifier import HybridPairwiseClassifier
from ai_service.ml.inference.engine import MLPairwiseInferenceEngine

def parse_record(row):
    text = row['input']
    field_m = re.search(r'Field:\s*([^\s(]+)', text)
    claim_m = re.search(r'Declared Claim:\s*\"([^\"]*)\"', text)
    ev_m = re.search(r'Supporting Evidence:\s*\"([^\"]*)\"', text)
    
    out = row['output']
    label_m = re.search(r'Label:\s*([A-Z_]+)', out)
    
    return {
        'id': row.get('id', 'unknown'),
        'field': field_m.group(1) if field_m else 'unknown',
        'claim': claim_m.group(1) if claim_m else '',
        'evidence': ev_m.group(1) if ev_m else '',
        'ground_truth': label_m.group(1) if label_m else 'UNKNOWN'
    }

def evaluate_engine(engine_name, predict_fn, records):
    y_true = []
    y_pred = []
    latencies = []
    
    for r in records:
        start = time.perf_counter()
        pred_label, conf = predict_fn(r)
        latency = (time.perf_counter() - start) * 1000
        latencies.append(latency)
        
        y_true.append(r['ground_truth'])
        y_pred.append(pred_label)
        
    classes = ['MATCH', 'MISMATCH', 'MISSING', 'UNCERTAIN', 'NOT_COMPARABLE']
    
    # Accuracy
    correct = sum(1 for yt, yp in zip(y_true, y_pred) if yt == yp)
    total = len(y_true)
    accuracy = correct / total if total > 0 else 0
    
    # Per-class metrics
    per_class = {}
    for c in classes:
        tp = sum(1 for yt, yp in zip(y_true, y_pred) if yt == c and yp == c)
        fp = sum(1 for yt, yp in zip(y_true, y_pred) if yt != c and yp == c)
        fn = sum(1 for yt, yp in zip(y_true, y_pred) if yt == c and yp != c)
        
        prec = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        rec = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = 2 * prec * rec / (prec + rec) if (prec + rec) > 0 else 0.0
        support = sum(1 for yt in y_true if yt == c)
        per_class[c] = {'precision': prec, 'recall': rec, 'f1': f1, 'support': support, 'tp': tp, 'fp': fp, 'fn': fn}
        
    macro_f1 = sum(m['f1'] for m in per_class.values()) / len(classes)
    avg_latency = sum(latencies) / len(latencies)
    
    return {
        'engine': engine_name,
        'total': total,
        'accuracy': accuracy,
        'macro_f1': macro_f1,
        'avg_latency_ms': avg_latency,
        'per_class': per_class,
        'y_true': y_true,
        'y_pred': y_pred
    }

def main():
    test_path = Path('ai_service/ml/data/adaption/test.jsonl')
    with open(test_path, 'r', encoding='utf-8') as f:
        records = [parse_record(json.loads(line)) for line in f]
        
    print(f"Loaded {len(records)} held-out test records from {test_path}")
    gt_counts = Counter(r['ground_truth'] for r in records)
    print(f"Ground Truth Distribution: {dict(gt_counts)}")
    
    # 1. Evaluate Hybrid Deterministic Classifier
    hybrid_clf = HybridPairwiseClassifier(confidence_threshold=0.75)
    def predict_hybrid(r):
        req = PairwiseRequest(
            claim_field=FieldCandidate(field_name=r['field'], field_label=r['field'], raw_value=r['claim']),
            evidence_field=FieldCandidate(field_name=r['field'], field_label=r['field'], raw_value=r['evidence']) if r['evidence'] else None,
            confidence_threshold=0.75
        )
        res = hybrid_clf.classify(req)
        return res.label.value, res.confidence
        
    res_hybrid = evaluate_engine("Form2Fact Hybrid Deterministic Engine", predict_hybrid, records)
    
    # 2. Evaluate Calibrated ML Inference Engine
    ml_engine = MLPairwiseInferenceEngine.get_instance()
    def predict_ml(r):
        req = PairwiseRequest(
            claim_field=FieldCandidate(field_name=r['field'], field_label=r['field'], raw_value=r['claim']),
            evidence_field=FieldCandidate(field_name=r['field'], field_label=r['field'], raw_value=r['evidence']) if r['evidence'] else None,
            confidence_threshold=0.60
        )
        res = ml_engine.classify(req)
        return res.label.value, res.confidence
        
    res_ml = evaluate_engine("Form2Fact Calibrated ML Engine (SentenceTransformer + Temp Scaling)", predict_ml, records)
    
    print("\n" + "="*70)
    print("EVALUATION RESULTS ON INDEPENDENT HELD-OUT TEST SPLIT (N = 83)")
    print("="*70)
    
    for res in [res_hybrid, res_ml]:
        print(f"\n--- {res['engine']} ---")
        print(f"Accuracy: {res['accuracy']*100:.2f}%")
        print(f"Macro F1: {res['macro_f1']:.4f}")
        print(f"Avg Latency: {res['avg_latency_ms']:.2f} ms")
        print("Per-class performance:")
        for c, m in res['per_class'].items():
            print(f"  {c:<15} Precision: {m['precision']*100:6.2f}% | Recall: {m['recall']*100:6.2f}% | F1: {m['f1']:.4f} | Support: {m['support']}")

    # Save benchmark json output
    output_dir = Path("docs/ml")
    output_dir.mkdir(parents=True, exist_ok=True)
    with open(output_dir / "test_split_benchmark_results.json", "w", encoding="utf-8") as f:
        json.dump({
            "dataset": str(test_path),
            "record_count": len(records),
            "ground_truth_distribution": dict(gt_counts),
            "results": [
                {k: v for k, v in res_hybrid.items() if k not in ['y_true', 'y_pred']},
                {k: v for k, v in res_ml.items() if k not in ['y_true', 'y_pred']}
            ]
        }, f, indent=2)
    print(f"\nResults saved to {output_dir / 'test_split_benchmark_results.json'}")

if __name__ == '__main__':
    main()
