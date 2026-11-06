"""
Form2Fact ML Feature Extractor.
Extracts dense semantic representations using sentence-transformers (all-MiniLM-L6-v2)
and constructs symmetric pairwise difference and interaction feature vectors.
"""

from typing import List, Tuple, Optional
import numpy as np

class PairwiseFeatureExtractor:
    """
    Computes dense 1536-dimensional pairwise interaction vectors from claim & evidence texts.
    Feature vector layout: [u, v, |u - v|, u * v] where u, v in R^384.
    """

    def __init__(self, model_name: str = "sentence-transformers/all-MiniLM-L6-v2"):
        self.model_name = model_name
        self._model = None

    def _load_model(self):
        if self._model is None:
            try:
                from sentence_transformers import SentenceTransformer
                self._model = SentenceTransformer(self.model_name)
            except Exception as e:
                raise RuntimeError(f"Failed to load embedding backbone {self.model_name}: {e}")
        return self._model

    def encode_single(self, text: str) -> np.ndarray:
        model = self._load_model()
        emb = model.encode(text, convert_to_numpy=True, normalize_embeddings=True)
        return emb

    def encode_pairs(self, claims: List[str], evidences: List[str]) -> np.ndarray:
        """
        Encodes list of (claim, evidence) text pairs into stacked pairwise feature matrix.
        Output shape: (N, 4 * embedding_dim) = (N, 1536) for 384-dim backbone.
        """
        model = self._load_model()
        u = model.encode(claims, convert_to_numpy=True, normalize_embeddings=True)
        v = model.encode(evidences, convert_to_numpy=True, normalize_embeddings=True)

        diff = np.abs(u - v)
        mult = u * v

        features = np.hstack([u, v, diff, mult])
        return features.astype(np.float32)

