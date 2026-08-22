from dataclasses import dataclass
import os


@dataclass(frozen=True)
class Settings:
  inference_enabled: bool
  model_id: str
  model_version: str
  expected_modality: str
  expected_sequence: str
  oa_model_path: str | None
  oa_model_version: str


def load_settings() -> Settings:
    return Settings(
        inference_enabled=os.getenv("KNEECO_INFERENCE_ENABLED", "false").lower() == "true",
        model_id=os.getenv("KNEECO_MODEL_ID", "aagatti/nnunet_knee"),
      model_version=os.getenv("KNEECO_MODEL_VERSION", "unvalidated"),
      expected_modality=os.getenv("KNEECO_EXPECTED_MODALITY", "MR"),
      expected_sequence=os.getenv("KNEECO_EXPECTED_SEQUENCE", "T2-weighted knee MRI"),
      oa_model_path=os.getenv("KNEECO_OA_MODEL_PATH") or None,
      oa_model_version=os.getenv("KNEECO_OA_MODEL_VERSION", "oa_mri_project_2026-08-22"),
  )
