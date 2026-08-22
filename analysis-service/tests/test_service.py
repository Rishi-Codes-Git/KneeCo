import base64
import io
import os
import sys
import unittest
from pathlib import Path

from fastapi.testclient import TestClient
from PIL import Image

SERVICE_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVICE_ROOT))

from app.main import app


def png_payload(width: int = 640, height: int = 640) -> str:
  image = Image.new("L", (width, height), color=100)
  buffer = io.BytesIO()
  image.save(buffer, format="PNG")
  return base64.b64encode(buffer.getvalue()).decode("ascii")


def pdf_payload() -> str:
    image = Image.new("RGB", (640, 640), color=(110, 110, 110))
    buffer = io.BytesIO()
    image.save(buffer, format="PDF")
    return base64.b64encode(buffer.getvalue()).decode("ascii")


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

    def test_image_preflight_decodes_image_but_does_not_claim_segmentation(self):
        response = self.client.post(
            "/v1/studies/preflight",
            json={
                "case_id": "KNEE-IMAGE-001",
                "file_name": "study.png",
                "content_type": "image/png",
                "content_base64": png_payload(),
            },
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["input_kind"], "image")
        self.assertFalse(payload["mm_measurement_eligible"])
        self.assertEqual(payload["model_execution"], "not_run")
        self.assertEqual([structure["detected"] for structure in payload["structures"]], [False, False, False])
        self.assertEqual(payload["image_quality"]["width_px"], 640)

    def test_unsupported_file_preflight_is_rejected(self):
        response = self.client.post(
            "/v1/studies/preflight",
            json={
                "case_id": "KNEE-IMAGE-002",
                "file_name": "study.txt",
                "content_type": "text/plain",
                "content_base64": base64.b64encode(b"not an image").decode("ascii"),
            },
        )
        self.assertEqual(response.status_code, 422)

    def test_pdf_preflight_renders_the_first_page_without_claiming_measurement(self):
        response = self.client.post(
            "/v1/studies/preflight",
            json={
                "case_id": "KNEE-PDF-001",
                "file_name": "study.pdf",
                "content_type": "application/pdf",
                "content_base64": pdf_payload(),
            },
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["input_kind"], "pdf")
        self.assertEqual(payload["page_count"], 1)
        self.assertFalse(payload["mm_measurement_eligible"])

    def test_implant_ranking_requires_clinician_initiation(self):
        response = self.client.post(
            "/v1/implant-candidates",
            json={
                "case_id": "KNEE-IMPLANT-001",
                "clinician_initiated": False,
                "bone_dimensions": {
                    "femoral_width_mm": 68,
                    "femoral_ap_mm": 61,
                    "tibial_width_mm": 72,
                    "tibial_ap_mm": 48,
                    "measurement_provenance": "clinician_verified",
                },
                "catalogue": [{
                    "manufacturer": "Reference manufacturer",
                    "system": "Reference system",
                    "size": "Reference size",
                    "femoral_width_mm": 68,
                    "femoral_ap_mm": 61,
                    "tibial_width_mm": 72,
                    "tibial_ap_mm": 48,
                }],
            },
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "not_initiated")

    def test_implant_ranking_orders_clinician_supplied_catalogue(self):
        response = self.client.post(
            "/v1/implant-candidates",
            json={
                "case_id": "KNEE-IMPLANT-002",
                "clinician_initiated": True,
                "bone_dimensions": {
                    "femoral_width_mm": 68,
                    "femoral_ap_mm": 61,
                    "tibial_width_mm": 72,
                    "tibial_ap_mm": 48,
                    "measurement_provenance": "clinician_verified",
                },
                "catalogue": [
                    {"manufacturer": "Reference manufacturer", "system": "Reference system", "size": "Larger", "femoral_width_mm": 78, "femoral_ap_mm": 71, "tibial_width_mm": 82, "tibial_ap_mm": 58},
                    {"manufacturer": "Reference manufacturer", "system": "Reference system", "size": "Closer", "femoral_width_mm": 68, "femoral_ap_mm": 61, "tibial_width_mm": 72, "tibial_ap_mm": 48},
                ],
            },
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ranked")
        self.assertEqual(payload["candidates"][0]["size"], "Closer")

    def test_analysis_request_is_blocked_before_validation(self):
        response = self.client.post(
            "/v1/analyses",
            json={"case_id": "KNEE-SETUP-001", "source_file_reference": "storage://pending-study.png"},
        )

        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json()["status"], "blocked")
