import os
import secrets
from fastapi import (
    FastAPI,
    HTTPException,
    Header,
    UploadFile,
    File,
    Depends
)
from .schemas import (
    PairwiseRequest,
    PairwiseResponse,
    BatchPairwiseRequest,
    BatchPairwiseResponse,
    PairwiseLabel
)
from .classifier import HybridPairwiseClassifier, MODEL_VERSION as FALLBACK_VERSION
from .dataset import evaluate_baseline_classifier
from .ocr import process_pdf, MAX_PDF_SIZE
from ai_service.ml.inference.engine import MLPairwiseInferenceEngine
try:
    from .model_loader import ModelArtifactLoader
except ImportError:
    ModelArtifactLoader = None

app = FastAPI(
    title="Form2Fact AI Document Intelligence Service",
    description="Pairwise field mismatch classification and document intelligence inference service.",
    version="2.0.0"
)

ml_engine = MLPairwiseInferenceEngine.get_instance()
loader = ModelArtifactLoader.get_instance() if ModelArtifactLoader else None
classifier = HybridPairwiseClassifier(
    confidence_threshold=loader.model_config.get("confidence_threshold", 0.75) if loader else 0.75
)


def verify_ocr_token(
    x_ocr_service_token: str = Header(default="")
):
    expected = os.getenv("OCR_SERVICE_TOKEN")
    if not expected or not secrets.compare_digest(
        x_ocr_service_token, expected
    ):
        raise HTTPException(
            status_code=401,
            detail="Unauthorized"
        )


@app.get("/api/v1/health")
@app.get("/health")
def health_check():
    ready = ml_engine.is_ready()
    readiness_report = loader.get_readiness_report() if loader else {}
    return {
        "status": "healthy" if ready else "degraded",
        "service": "form2fact-ai-service",
        "model_version": ml_engine.model_version if ready else FALLBACK_VERSION,
        "ml_ready": ready,
        "is_calibrated": getattr(ml_engine, "is_calibrated", False),
        "optimal_temperature": getattr(ml_engine, "temperature", 1.0),
        "abstention_threshold": getattr(ml_engine, "default_threshold", 0.60),
        "artifact_checksum": getattr(ml_engine, "artifact_checksum", None),
        "checksum_verified": getattr(ml_engine, "checksum_verified", False),
        "startup_time_ms": getattr(ml_engine, "startup_time_ms", 0.0),
        "model_readiness": readiness_report,
        "capabilities": [
            "pairwise_field_comparison",
            "confidence_estimation",
            "abstention_support",
            "deterministic_fast_path",
            "sentence_transformer_ml_classification",
            "temperature_scaled_calibration",
            "startup_checksum_validation",
            "versioned_artifact_manifest",
            "page_level_pdf_ocr"
        ]
    }


@app.post("/api/v1/ocr/pdf")
async def ocr_pdf(
    file: UploadFile = File(...),
    _: None = Depends(verify_ocr_token)
):
    data = bytearray()
    try:
        while True:
            chunk = await file.read(1024 * 1024)
            if not chunk:
                break
            data.extend(chunk)
            if len(data) > MAX_PDF_SIZE:
                raise HTTPException(
                    status_code=413,
                    detail="PDF exceeds 15 MB limit"
                )
        return process_pdf(bytes(data))
    finally:
        await file.close()


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
        total=len(results),
        matches=counts.get(PairwiseLabel.MATCH.value, 0),
        mismatches=counts.get(PairwiseLabel.MISMATCH.value, 0),
        missing=counts.get(PairwiseLabel.MISSING.value, 0),
        uncertain=counts.get(PairwiseLabel.UNCERTAIN.value, 0),
        not_comparable=counts.get(PairwiseLabel.NOT_COMPARABLE.value, 0),
        results=results
    )


@app.post("/api/v1/evaluate")
def run_evaluation():
    try:
        return evaluate_baseline_classifier()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
