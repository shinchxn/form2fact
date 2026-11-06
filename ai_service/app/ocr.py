
import io
import pymupdf
import pytesseract

from PIL import Image
from fastapi import HTTPException


MAX_PDF_SIZE = 15 * 1024 * 1024
MAX_PAGES = 100


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
                pix = page.get_pixmap(
                    matrix=pymupdf.Matrix(2, 2),
                    alpha=False
                )
                image = Image.open(
                    io.BytesIO(pix.tobytes("png"))
                )

                data_result = pytesseract.image_to_data(
                    image,
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

                text = " ".join(words)
                method = "ocr"

                if scores:
                    ocr_confidence = round(
                        sum(scores) / len(scores), 2
                    )

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
