import os
import sys
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

SERVICE_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVICE_ROOT))

from app.main import app


class KneeCoAnalysisServiceTest(unittest.TestCase):
    def setUp(self):
        os.environ["KNEECO_INFERENCE_ENABLED"] = "false"
        self.client = TestClient(app)

    def test_health_declares_model_ready_but_unvalidated_state(self):
        response = self.client.get("/health")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["state"], "awaiting_validation_scan")
        self.assertFalse(payload["inference_enabled"])
        self.assertEqual(payload["model_id"], "aagatti/nnunet_knee")

    def test_analysis_request_is_blocked_before_validation(self):
        response = self.client.post(
            "/v1/analyses",
            json={"case_id": "KNEE-SETUP-001", "source_file_reference": "storage://pending-study.dcm"},
        )

        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json()["status"], "blocked")
