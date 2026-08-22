# KneeCo Analysis Service

This service is the isolated backend boundary for automatic knee-MRI analysis. It is intentionally **model-ready but inference-disabled** until the team obtains a de-identified, compatible T2 knee MRI study and validates the full pipeline.

## What is ready now

The service has a health endpoint, typed request/response contracts, model configuration, and a safety block that prevents an unvalidated model from emitting clinical-style results.

## What is deliberately not enabled

No model weights, DICOM-to-NIfTI conversion, automatic segmentation, or physical thickness measurement runs in this scaffold. Do not represent it as a clinically validated model.

## Local test

```bash
cd analysis-service
python3 -m unittest tests/test_service.py
```

## Validation gate before inference

1. Obtain a de-identified T2 knee MRI DICOM study or compatible NIfTI/NRRD volume.
2. Confirm the input matches the selected model’s format requirements.
3. Install and version the model runtime separately from the core web app.
4. Validate conversion, masks for femur/tibia/medial meniscus, physical-spacing measurement, quality checks, and clinician review.
5. Only then set `KNEECO_INFERENCE_ENABLED=true` in the service environment.
