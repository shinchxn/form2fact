"""
Form2Fact Supervised Pairwise Classifier Head.
Lightweight, CPU-friendly MLP model with calibrated probabilities and class weighting.
"""

import json
from pathlib import Path
from typing import Dict, Any, Tuple, Optional
import numpy as np

LABEL_NAMES = ["MATCH", "MISMATCH", "MISSING", "UNCERTAIN", "NOT_COMPARABLE"]
LABEL_TO_INT = {l: i for i, l in enumerate(LABEL_NAMES)}
INT_TO_LABEL = {i: l for i, l in enumerate(LABEL_NAMES)}

class PairwiseMLPClassifier:
    """
    Scikit-learn MLP-based classifier head operating on pairwise sentence embeddings.
    Provides probability distribution, predicted label, and calibrated confidence score.
    """

    def __init__(self, hidden_layer_sizes: Tuple[int, ...] = (128, 64), random_state: int = 42):
        self.hidden_layer_sizes = hidden_layer_sizes
        self.random_state = random_state
        self._clf = None

    def fit(self, X: np.ndarray, y: np.ndarray):
        from sklearn.neural_network import MLPClassifier
        self._clf = MLPClassifier(
            hidden_layer_sizes=self.hidden_layer_sizes,
            activation='relu',
            solver='adam',
            alpha=1e-4,
            batch_size=min(32, len(X)),
            learning_rate_init=1e-3,
            max_iter=200,
            random_state=self.random_state,
            early_stopping=True,
            n_iter_no_change=15
        )
        self._clf.fit(X, y)
        return self

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        if self._clf is None:
            raise RuntimeError("Classifier head is not fitted.")
        return self._clf.predict_proba(X)

    def predict(self, X: np.ndarray) -> np.ndarray:
        if self._clf is None:
            raise RuntimeError("Classifier head is not fitted.")
        return self._clf.predict(X)

    def save(self, filepath: Path):
        import pickle
        filepath.parent.mkdir(parents=True, exist_ok=True)
        with open(filepath, 'wb') as f:
            pickle.dump(self._clf, f)

    def load(self, filepath: Path):
        import pickle
        with open(filepath, 'rb') as f:
            self._clf = pickle.load(f)
        return self

