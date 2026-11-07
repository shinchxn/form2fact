import io

import pymupdf
import pytesseract

from PIL import Image
from fastapi import HTTPException


MAX_PDF_SIZE = 15 * 1024 * 1024
MAX_PAGES = 100


def process_pdf(data: bytes):
    if len(data) > MAX_PDF_SIZE:
        raise HTTPException(
            status_code=413,
            detail="PDF exceeds 15 MB limit"
        )

    if not data.startswith(b"%PDF-"):
        raise HTTPException(
            status_code=400,
            detail="Invalid PDF file"
        )

    pdf = None

    try:
        pdf = pymupdf.open(stream=data, filetype="pdf")

        if pdf.page_count > MAX_PAGES:
            raise HTTPException(
                status_code=400,
                detail="PDF exceeds 100 pages"
            )

        pages = []

        for index, page in enumerate(pdf):
            text = page.get_text("text").strip()
            method = "text_layer"
            ocr_confidence = None
            word_boxes = []

            if len(text) < 40:
                pix = page.get_pixmap(
                    matrix=pymupdf.Matrix(2, 2),
                    alpha=False
                )

                image = Image.open(
                    io.BytesIO(pix.tobytes("png"))
                )
                image_width, image_height = image.size

                try:
                    data_result = pytesseract.image_to_data(
                        image,
                        output_type=pytesseract.Output.DICT,
                        timeout=20
                    )
                finally:
                    image.close()

                words = []
                scores = []

                for word, confidence, left, top, width, height in zip(
                    data_result["text"],
                    data_result["conf"],
                    data_result["left"],
                    data_result["top"],
                    data_result["width"],
                    data_result["height"]
                ):
                    word = word.strip()

                    if not word:
                        continue

                    try:
                        score = float(confidence)
                    except (ValueError, TypeError):
                        continue

                    if score < 0:
                        continue

                    words.append(word)
                    scores.append(score)

                    word_boxes.append({
                        "text": word,
                        "confidence": round(score, 2),
                        "x": round(left / image_width, 6),
                        "y": round(top / image_height, 6),
                        "width": round(width / image_width, 6),
                        "height": round(height / image_height, 6)
                    })

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
                "status": "extracted" if text else "unreadable",
                "wordBoxes": word_boxes
            })

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

    finally:
        if pdf is not None:
            pdf.close()
