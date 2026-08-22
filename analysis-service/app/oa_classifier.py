"""Lazy adapter for the supplied OA MRI Keras classifier.

The verified package is a four-class 2D image classifier. It does not provide
femur/tibia/meniscus masks, physical spacing, or meniscus thickness. This
adapter deliberately exposes only the model's raw stage-label probability
output for clinician review; it is not a diagnosis endpoint.
"""

from __future__ import annotations

from pathlib import Path
from typing import Protocol

import numpy as np
from PIL import Image


CLASS_NAMES = ("Normal", "MildOA", "ModerateOA", "SevereOA")


class Predictor(Protocol):
    def predict(self, batch: np.ndarray, verbose: int = 0) -> np.ndarray: ...


class OaClassifier:
    def __init__(self, model_path: str | None):
        self.model_path = Path(model_path) if model_path else None
        self._model: Predictor | None = None

    @property
    def available(self) -> bool:
        return bool(self.model_path and self.model_path.is_file())

    def _load(self) -> Predictor:
        if not self.available:
            raise RuntimeError("The OA classifier artifact is not available at KNEECO_OA_MODEL_PATH.")
        if self._model is None:
            import tensorflow as tf

            self._model = tf.keras.models.load_model(self.model_path, compile=False, safe_mode=True)
        return self._model

    def classify(self, image: Image.Image) -> dict[str, object]:
        model = self._load()
        rgb = image.convert("RGB").resize((224, 224))
        batch = np.expand_dims(np.asarray(rgb, dtype=np.float32), axis=0)
        probabilities = np.asarray(model.predict(batch, verbose=0)[0], dtype=np.float32)
        if probabilities.shape != (len(CLASS_NAMES),):
            raise RuntimeError("The OA classifier returned an unexpected output shape.")
        label_index = int(np.argmax(probabilities))
        return {
            "input_shape": [224, 224, 3],
            "stage_label": CLASS_NAMES[label_index],
            "stage_probabilities": {name: round(float(score), 6) for name, score in zip(CLASS_NAMES, probabilities)},
            "top_class_probability": round(float(probabilities[label_index]), 6),
        }
