
import io
import unittest
from unittest.mock import patch

import pymupdf
from PIL import Image

from app import ocr


def create_text_pdf():
    pdf = pymupdf.open()
    page = pdf.new_page()
    page.insert_text(
        (50, 80),
        "Form2Fact document test with enough text "
        "to avoid triggering OCR extraction."
    )
    data = pdf.tobytes()
    pdf.close()
    return data


def create_scanned_pdf():
    image = Image.new("RGB", (600, 200), "white")
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")

    pdf = pymupdf.open()
    page = pdf.new_page()
    page.insert_image(page.rect, stream=buffer.getvalue())

    data = pdf.tobytes()
    pdf.close()
    return data


class TestOCR(unittest.TestCase):

    def test_text_layer_extraction(self):
        result = ocr.process_pdf(create_text_pdf())

        self.assertEqual(result["pageCount"], 1)
        self.assertEqual(
            result["pages"][0]["extractionMethod"],
            "text_layer"
        )
        self.assertIn(
            "Form2Fact",
            result["pages"][0]["text"]
        )

    @patch("app.ocr.pytesseract.image_to_data")
    def test_scanned_pdf_ocr(self, mock_ocr):
        mock_ocr.return_value = {
            "text": ["FORM2FACT", "TEST"],
            "conf": ["90", "80"]
        }

        result = ocr.process_pdf(create_scanned_pdf())

        page = result["pages"][0]

        self.assertEqual(page["extractionMethod"], "ocr")
        self.assertIn("FORM2FACT", page["text"])
        self.assertEqual(page["ocrConfidence"], 85.0)

    def test_invalid_pdf(self):
        with self.assertRaises(ocr.HTTPException) as error:
            ocr.process_pdf(b"not a pdf")

        self.assertEqual(error.exception.status_code, 400)

    def test_pdf_size_limit(self):
        with patch.object(ocr, "MAX_PDF_SIZE", 10):
            with self.assertRaises(ocr.HTTPException) as error:
                ocr.process_pdf(b"x" * 11)

        self.assertEqual(error.exception.status_code, 413)

    def test_page_limit(self):
        pdf = pymupdf.open()
        pdf.new_page()
        pdf.new_page()
        data = pdf.tobytes()
        pdf.close()

        with patch.object(ocr, "MAX_PAGES", 1):
            with self.assertRaises(ocr.HTTPException) as error:
                ocr.process_pdf(data)

        self.assertEqual(error.exception.status_code, 400)


if __name__ == "__main__":
    unittest.main()
