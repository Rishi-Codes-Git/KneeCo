import base64
import os
import sys
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

SERVICE_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVICE_ROOT))

from app.main import app


class SuppliedOaModelIntegrationTest(unittest.TestCase):
    def test_supplied_keras_weights_return_a_review_only_four_class_response(self):
        model_path = os.environ.get("KNEECO_TEST_MODEL_PATH")
        sample_path = os.environ.get("KNEECO_TEST_SAMPLE_PATH")
        if not model_path or not sample_path:
            self.skipTest("Set KNEECO_TEST_MODEL_PATH and KNEECO_TEST_SAMPLE_PATH for controlled supplied-model validation.")

        os.environ["KNEECO_OA_MODEL_PATH"] = model_path
        sample = Path(sample_path)
        content_type = "image/png" if sample.suffix.lower() == ".png" else "image/jpeg"
        payload = {
            "case_id": "KNEECO-MODEL-VALIDATION",
            "file_name": sample.name,
            "content_type": content_type,
            "content_base64": base64.b64encode(sample.read_bytes()).decode("ascii"),
        }
        response = TestClient(app).post("/v1/studies/classify-oa", json=payload)

        self.assertEqual(response.status_code, 200)
        result = response.json()
        self.assertEqual(result["status"], "model_result_for_review")
        self.assertEqual(result["input_shape"], [224, 224, 3])
        self.assertEqual(set(result["stage_probabilities"]), {"Normal", "MildOA", "ModerateOA", "SevereOA"})
        self.assertAlmostEqual(sum(result["stage_probabilities"].values()), 1.0, places=4)
        self.assertTrue(result["requires_clinician_review"])
        self.assertFalse(result["is_diagnosis"])
