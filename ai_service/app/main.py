from fastapi import FastAPI, HTTPException
from .schemas import (
    PairwiseRequest,
    PairwiseResponse,
    BatchPairwiseRequest,
    BatchPairwiseResponse,
    PairwiseLabel
)
from .classifier import HybridPairwiseClassifier, MODEL_VERSION as FALLBACK_VERSION
from .dataset import evaluate_baseline_classifier
from ai_service.ml.inference.engine import MLPairwiseInferenceEngine

app = FastAPI(
    title="Form2Fact AI Document Intelligence Service",
    description="Pairwise field mismatch classification and document intelligence inference service.",
    version="2.0.0"
)

ml_engine = MLPairwiseInferenceEngine.get_instance()
classifier = HybridPairwiseClassifier(confidence_threshold=0.75)


@app.get("/api/v1/health")
def health_check():
    ready = ml_engine.is_ready()
    return {
        "status": "healthy" if ready else "degraded",
        "service": "form2fact-ai-service",
        "model_version": ml_engine.model_version if ready else FALLBACK_VERSION,
        "ml_ready": ready,
        "is_calibrated": getattr(ml_engine, "is_calibrated", False),
        "optimal_temperature": getattr(ml_engine, "temperature", 1.0),
        "abstention_threshold": getattr(ml_engine, "default_threshold", 0.60),
        "capabilities": [
            "pairwise_field_comparison",
            "confidence_estimation",
            "abstention_support",
            "deterministic_fast_path",
            "sentence_transformer_ml_classification",
            "temperature_scaled_calibration"
        ]
    }


@app.post("/api/v1/classify-pair", response_model=PairwiseResponse)
def classify_pair(request: PairwiseRequest):
    if not ml_engine.is_ready():
        raise HTTPException(
            status_code=503,
            detail="ML pairwise classification model is not ready or artifact is missing/corrupt. Silent fallback is disabled."
        )
    try:
        return ml_engine.classify(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Classification failed: {str(e)}")


@app.post("/api/v1/ml/classify-pair", response_model=PairwiseResponse)
def ml_classify_pair(request: PairwiseRequest):
    if not ml_engine.is_ready():
        raise HTTPException(
            status_code=503,
            detail="ML pairwise classification model is not ready or artifact is missing/corrupt. Silent fallback is disabled."
        )
    try:
        return ml_engine.classify(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ML classification failed: {str(e)}")


@app.post("/api/v1/batch-classify", response_model=BatchPairwiseResponse)
def batch_classify(request: BatchPairwiseRequest):
    if not ml_engine.is_ready():
        raise HTTPException(
            status_code=503,
            detail="ML pairwise classification model is not ready or artifact is missing/corrupt. Silent fallback is disabled."
        )
    results = []
    counts = {label.value: 0 for label in PairwiseLabel}

    for comp in request.comparisons:
        res = ml_engine.classify(comp)
        results.append(res)
        counts[res.label.value] += 1

    return BatchPairwiseResponse(
        results=results,
        total=len(results),
        matches=counts[PairwiseLabel.MATCH.value],
        mismatches=counts[PairwiseLabel.MISMATCH.value],
        missing=counts[PairwiseLabel.MISSING.value],
        uncertain=counts[PairwiseLabel.UNCERTAIN.value],
        not_comparable=counts[PairwiseLabel.NOT_COMPARABLE.value]
    )


@app.get("/api/v1/evaluate-baseline")
def run_evaluation():
    return evaluate_baseline_classifier()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
