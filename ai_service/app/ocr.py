
import io
import os
import pymupdf
import pytesseract

from PIL import Image
from fastapi import HTTPException


MAX_PDF_SIZE = 15 * 1024 * 1024
MAX_PAGES = 100


def get_ocr_lang() -> str:
    """
    Resolves supported OCR languages with safe fallback.
    Supports English ('eng') and Tamil ('tam'), as well as Hindi ('hin').
    """
    preferred = os.environ.get("FORM2FACT_OCR_LANG", "eng+tam")
    try:
        available = pytesseract.get_languages()
        parts = [p.strip() for p in preferred.split("+")]
        valid = [p for p in parts if p in available]
        if valid:
            return "+".join(valid)
        if "eng" in available:
            return "eng"
    except Exception:
        pass
    return "eng"


def process_pdf(data: bytes):
    if len(data) > MAX_PDF_SIZE:
        raise HTTPException(status_code=413, detail="PDF exceeds 15 MB limit")

    if not data.startswith(b"%PDF-"):
        raise HTTPException(status_code=400, detail="Invalid PDF file")

    try:
        pdf = pymupdf.open(stream=data, filetype="pdf")

        if pdf.page_count > MAX_PAGES:
            raise HTTPException(status_code=400, detail="PDF exceeds 100 pages")

        pages = []

        for index, page in enumerate(pdf):
            text = page.get_text("text").strip()
            method = "text_layer"
            ocr_confidence = None

            # OCR only when the existing text layer is poor
            if len(text) < 40:
                try:
                    pix = page.get_pixmap(
                        matrix=pymupdf.Matrix(2, 2),
                        alpha=False
                    )
                    image = Image.open(
                        io.BytesIO(pix.tobytes("png"))
                    )

                    active_lang = get_ocr_lang()
                    data_result = pytesseract.image_to_data(
                        image,
                        lang=active_lang,
                        output_type=pytesseract.Output.DICT,
                        timeout=20
                    )

                    words = []
                    scores = []

                    for word, confidence in zip(
                        data_result["text"],
                        data_result["conf"]
                    ):
                        word = word.strip()

                        if word:
                            words.append(word)

                        try:
                            score = float(confidence)
                            if score >= 0:
                                scores.append(score)
                        except (ValueError, TypeError):
                            pass

                    ocr_text = " ".join(words)
                    if ocr_text:
                        text = ocr_text
                        method = "ocr"

                    if scores:
                        ocr_confidence = round(
                            sum(scores) / len(scores), 2
                        )
                except Exception:
                    # Graceful fallback: If Tesseract OCR binary is missing or times out,
                    # retain existing text layer; page will be marked unreadable if empty.
                    pass

            pages.append({
                "pageNumber": index + 1,
                "text": text,
                "extractionMethod": method,
                "ocrConfidence": ocr_confidence,
                "characterCount": len(text),
                "status": "extracted" if text else "unreadable"
            })

        pdf.close()

        return {
            "pageCount": len(pages),
            "pages": pages
        }

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=422,
            detail=f"PDF processing failed: {str(exc)}"
        )
