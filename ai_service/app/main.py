
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
from .classifier import HybridPairwiseClassifier, MODEL_VERSION
from .dataset import evaluate_baseline_classifier
from .ocr import process_pdf, MAX_PDF_SIZE


app = FastAPI(
    title="Form2Fact AI Document Intelligence Service",
    description="Pairwise field mismatch classification and document intelligence inference service.",
    version="1.0.0"
)

classifier = HybridPairwiseClassifier(confidence_threshold=0.75)


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
def health_check():
    return {
        "status": "healthy",
        "service": "form2fact-ai-service",
        "model_version": MODEL_VERSION,
        "capabilities": [
            "pairwise_field_comparison",
            "confidence_estimation",
            "abstention_support",
            "deterministic_fast_path",
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


@app.post(
    "/api/v1/classify-pair",
    response_model=PairwiseResponse
)
def classify_pair(request: PairwiseRequest):
    try:
        return classifier.classify(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post(
    "/api/v1/batch-classify",
    response_model=BatchPairwiseResponse
)
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
    uvicorn.run(app, host="0.0.0.0", port=8000)
