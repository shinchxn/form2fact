"""
Form2Fact Pairwise Classifier — Preprocessing Pipeline

Handles text cleaning, normalization, OCR noise detection, and
structured input construction for the ML classification model.

Design principles:
  - Original raw values are always preserved for auditability.
  - Normalized values are computed separately and used for feature input.
  - Preprocessing is deterministic and reproducible (no randomness).
  - Domain knowledge (field types, aliases) is supplied externally.
"""

import re
import unicodedata
from dataclasses import dataclass, field
from typing import Optional


# ---------------------------------------------------------------------------
# OCR degradation detection
# ---------------------------------------------------------------------------

_OCR_CORRUPTION_PATTERNS = re.compile(
    r'(\uFFFD{2,})'          # Unicode replacement characters
    r'|(\?{3,})'             # Repeated question marks
    r'|(@{2,})'              # Repeated @ symbols
    r'|(\#{3,})'             # Repeated # symbols
    r'|\[OCR UNREADABLE\]'   # Explicit OCR failure sentinel
    r'|\[SCANNED BITMAP\]'   # Explicit scanned-only marker
    r'|OCR TEXT LAYER NOT PRESENT',
    re.IGNORECASE
)

_OCR_JUNK_RATIO_THRESHOLD = 0.25  # >25% non-alphanumeric = likely corrupted


def is_ocr_degraded(text: str) -> bool:
    """Return True if the text appears to be OCR-corrupted or unreadable."""
    if not text or not text.strip():
        return False
    if _OCR_CORRUPTION_PATTERNS.search(text):
        return True
    # Measure ratio of non-alphanumeric (excluding spaces) characters
    non_alnum = sum(1 for c in text if not c.isalnum() and c not in ' .,/-:()')
    if len(text) > 0 and non_alnum / len(text) > _OCR_JUNK_RATIO_THRESHOLD:
        return True
    return False


# ---------------------------------------------------------------------------
# Missing value detection
# ---------------------------------------------------------------------------

_MISSING_SENTINELS = frozenset({
    '', 'n/a', 'na', 'null', 'none', 'nil', '-', '--', '---',
    'not available', 'not provided', 'missing', 'unknown', 'undefined'
})


def is_missing_value(value: Optional[str]) -> bool:
    """Return True if the value represents a missing/absent field."""
    if value is None:
        return True
    return value.strip().lower() in _MISSING_SENTINELS


# ---------------------------------------------------------------------------
# Text normalization
# ---------------------------------------------------------------------------

def normalize_unicode(text: str) -> str:
    """Apply Unicode NFKC normalization to harmonize character forms."""
    return unicodedata.normalize('NFKC', text)


def normalize_whitespace(text: str) -> str:
    """Collapse all whitespace variants to a single space."""
    return re.sub(r'\s+', ' ', text).strip()


def normalize_case(text: str) -> str:
    """Lowercase for comparison purposes; preserves original for display."""
    return text.lower()


def clean_punctuation(text: str) -> str:
    """Remove punctuation not meaningful for semantic comparison."""
    cleaned = re.sub(r"[.,\/#!$%\^&\*;:{}=`~\"''""'']", ' ', text)
    return normalize_whitespace(cleaned)


def normalize_text(text: str) -> str:
    """
    Full normalization pipeline for text comparison.

    Applies: unicode → whitespace → case → punctuation removal.
    Returns the normalized string; the original is preserved by the caller.
    """
    if not text:
        return ''
    t = normalize_unicode(text)
    t = normalize_whitespace(t)
    t = normalize_case(t)
    t = clean_punctuation(t)
    return t


# ---------------------------------------------------------------------------
# Numeric normalization
# ---------------------------------------------------------------------------

_NUMERIC_PATTERN = re.compile(r'^[+-]?\d{1,3}(?:,\d{3})*(?:\.\d+)?$|^[+-]?\d+(?:\.\d+)?$')


def extract_numeric(text: str) -> Optional[float]:
    """Extract a single numeric value from a string, handling commas."""
    cleaned = text.strip().replace(',', '')
    try:
        return float(cleaned)
    except ValueError:
        # Try to find a number embedded in text
        match = re.search(r'[+-]?\d+(?:\.\d+)?', cleaned)
        if match:
            return float(match.group())
        return None


def normalize_numeric(text: str) -> str:
    """Return a canonical numeric string, or the original if not parseable."""
    val = extract_numeric(text)
    if val is None:
        return text.strip()
    # Remove trailing zeros for integers
    if val == int(val):
        return str(int(val))
    return f'{val:.6f}'.rstrip('0')


# ---------------------------------------------------------------------------
# Date normalization
# ---------------------------------------------------------------------------

_DATE_PATTERNS = [
    # ISO: 2025-03-31
    (re.compile(r'^(\d{4})-(\d{2})-(\d{2})$'), lambda m: f"{m.group(1)}-{m.group(2)}-{m.group(3)}"),
    # DD/MM/YYYY
    (re.compile(r'^(\d{2})/(\d{2})/(\d{4})$'), lambda m: f"{m.group(3)}-{m.group(2)}-{m.group(1)}"),
    # DD-MM-YYYY
    (re.compile(r'^(\d{2})-(\d{2})-(\d{4})$'), lambda m: f"{m.group(3)}-{m.group(2)}-{m.group(1)}"),
    # YYYY/MM/DD
    (re.compile(r'^(\d{4})/(\d{2})/(\d{2})$'), lambda m: f"{m.group(1)}-{m.group(2)}-{m.group(3)}"),
]

_MONTH_NAMES = {
    'january': '01', 'february': '02', 'march': '03', 'april': '04',
    'may': '05', 'june': '06', 'july': '07', 'august': '08',
    'september': '09', 'october': '10', 'november': '11', 'december': '12',
    'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
    'jun': '06', 'jul': '07', 'aug': '08', 'sep': '09',
    'oct': '10', 'nov': '11', 'dec': '12'
}


def normalize_date(text: str) -> Optional[str]:
    """
    Normalize a date string to ISO 8601 (YYYY-MM-DD).
    Returns None if the input cannot be recognized as a date.
    """
    if not text:
        return None
    text = text.strip()

    for pattern, formatter in _DATE_PATTERNS:
        m = pattern.match(text)
        if m:
            return formatter(m)

    # Natural language: "31 March 2025" or "March 31, 2025"
    natural = re.match(
        r'(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})', text
    )
    if natural:
        day, month_str, year = natural.group(1), natural.group(2).lower(), natural.group(3)
        month = _MONTH_NAMES.get(month_str)
        if month:
            return f"{year}-{month}-{int(day):02d}"

    natural2 = re.match(
        r'([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})', text
    )
    if natural2:
        month_str, day, year = natural2.group(1).lower(), natural2.group(2), natural2.group(3)
        month = _MONTH_NAMES.get(month_str)
        if month:
            return f"{year}-{month}-{int(day):02d}"

    return None


# ---------------------------------------------------------------------------
# Structured input construction for ML model
# ---------------------------------------------------------------------------

@dataclass
class FieldInput:
    """Represents one side of a pairwise comparison."""
    field_name: str
    field_label: str
    raw_value: str
    normalized_value: Optional[str] = None
    context: Optional[str] = None
    document_type: Optional[str] = None
    extraction_confidence: float = 1.0

    @property
    def is_missing(self) -> bool:
        return is_missing_value(self.raw_value)

    @property
    def is_ocr_degraded(self) -> bool:
        return is_ocr_degraded(self.raw_value)

    @property
    def effective_value(self) -> str:
        """Return normalized_value if available, else normalize raw_value."""
        return self.normalized_value or normalize_text(self.raw_value)


@dataclass
class PairInput:
    """Structured input for a pairwise classification request."""
    claim: FieldInput
    evidence: Optional[FieldInput]
    field_type: str = 'generic'       # numeric | date | entity_name | code | generic
    domain: str = 'aicte'
    comparison_hint: Optional[str] = None


def build_model_text(pair: PairInput) -> str:
    """
    Construct a single string representation of the pair for the ML model.

    Format:
        Field: <name> | Type: <type> | Domain: <domain>
        Claim: <value> | Context: <context> | DocType: <doc_type>
        Evidence: <value> | Context: <context> | DocType: <doc_type>
    """
    claim = pair.claim
    ev = pair.evidence

    claim_ctx = claim.context or ''
    claim_doc = claim.document_type or ''
    claim_val = claim.raw_value if not claim.is_missing else '[MISSING]'

    if ev is None or ev.is_missing:
        ev_val = '[MISSING]'
        ev_ctx = ''
        ev_doc = ''
    else:
        ev_val = ev.raw_value
        ev_ctx = ev.context or ''
        ev_doc = ev.document_type or ''

    parts = [
        f"Field: {claim.field_name} | Type: {pair.field_type} | Domain: {pair.domain}",
        f"Claim: {claim_val} | Context: {claim_ctx} | DocType: {claim_doc}",
        f"Evidence: {ev_val} | Context: {ev_ctx} | DocType: {ev_doc}",
    ]
    if pair.comparison_hint:
        parts.append(f"Hint: {pair.comparison_hint}")

    return ' '.join(parts)


def build_sentence_pair(pair: PairInput) -> tuple[str, str]:
    """
    Build a sentence pair (sentence_a, sentence_b) for cross-encoder or bi-encoder models.
    sentence_a encodes the claim, sentence_b encodes the evidence.
    """
    claim = pair.claim
    ev = pair.evidence

    prefix = f"[{pair.field_name if hasattr(pair, 'field_name') else claim.field_name}][{pair.field_type}]"

    claim_text = f"{prefix} {claim.raw_value}"
    if claim.context:
        claim_text += f" ({claim.context})"

    if ev is None or ev.is_missing:
        ev_text = f"{prefix} [MISSING]"
    else:
        ev_text = f"{prefix} {ev.raw_value}"
        if ev.context:
            ev_text += f" ({ev.context})"

    return claim_text, ev_text

