from fastapi import FastAPI, HTTPException
from .schemas import (
    PairwiseRequest,
    PairwiseResponse,
    BatchPairwiseRequest,
    BatchPairwiseResponse,
    PairwiseLabel
)
from .classifier import HybridPairwiseClassifier, MODEL_VERSION
from .dataset import evaluate_baseline_classifier
from .model_loader import ModelArtifactLoader

app = FastAPI(
    title="Form2Fact AI Document Intelligence Service",
    description="Pairwise field mismatch classification and document intelligence inference service.",
    version="1.2.0"
)

loader = ModelArtifactLoader.get_instance()
classifier = HybridPairwiseClassifier(
    confidence_threshold=loader.model_config.get("confidence_threshold", 0.75)
)


@app.get("/api/v1/health")
@app.get("/health")
def health_check():
    readiness = loader.get_readiness_report()
    return {
        "status": "healthy",
        "service": "form2fact-ai-service",
        "model_version": readiness.get("active_version", MODEL_VERSION),
        "model_readiness": readiness,
        "capabilities": [
            "pairwise_field_comparison",
            "confidence_estimation",
            "abstention_support",
            "deterministic_fast_path",
            "versioned_artifact_manifest"
        ]
    }


@app.post("/api/v1/classify-pair", response_model=PairwiseResponse)
def classify_pair(request: PairwiseRequest):
    try:
        return classifier.classify(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/batch-classify", response_model=BatchPairwiseResponse)
def batch_classify(request: BatchPairwiseRequest):
    results = []
    counts = {label.value: 0 for label in PairwiseLabel}

    for comp in request.comparisons:
        res = classifier.classify(comp)
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
    import os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
