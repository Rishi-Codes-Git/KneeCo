# KneeCo Analysis Service

This FastAPI service is an isolated decision-support boundary for the KneeCo workflow. It now provides two safe, testable capabilities: image/PDF **technical preflight** and clinician-initiated **implant-candidate ranking** from verified dimensions and a clinician-supplied catalogue.

The current model package also contains a verified-loadable Keras **four-class 2D OA image classifier**. To enable its review-only endpoint locally, point `KNEECO_OA_MODEL_PATH` to the `oa_model_final.keras` artifact. Keep the model artifact outside the web project directory; it is a runtime asset, not a frontend static file.

## What works now

`POST /v1/studies/preflight` accepts JPG, JPEG, PNG, or PDF content encoded as base64. It decodes an image (or renders the first PDF page), records technical image quality signals, returns a SHA-256 fingerprint, and makes the calibration requirement explicit. It does **not** infer structures, diagnose OA, generate a meniscus thickness, or produce millimetre values.

`POST /v1/implant-candidates` ranks a supplied catalogue by four clinician-verified bone dimensions only after the clinician explicitly initiates planning. The response is a dimensional-proximity ordering, not an implant recommendation or surgical plan.

`POST /v1/studies/classify-oa` loads the configured `oa_model_final.keras` lazily and returns the raw four-class image-classifier probabilities (`Normal`, `MildOA`, `ModerateOA`, or `SevereOA`) for clinician review. This model accepts a 224×224 RGB image after service preprocessing. It is not a diagnosis, does not generate anatomy masks, and does not measure femur, tibia, or medial-meniscus thickness.

## What is deliberately blocked

The uploaded model archive is a presentation simulation. It contains no trained Keras weights, segmentation model, or validated physical-spacing workflow. Consequently, automatic femur/tibia/medial-meniscus segmentation and meniscus-thickness extraction remain blocked until the team supplies a trained, versioned model and validates it against compatible de-identified MRI data with physical spacing.

The optional public `aagatti/nnunet_knee` model card documents a 3D nnU-Net model that expects T2 MRI volumes in NIfTI or NRRD format; it is not a direct substitute for an arbitrary 2D image/PDF upload. Treat any future integration as controlled validation work, not a clinical deployment.

## Local test

```bash
cd analysis-service
python3 -m unittest tests/test_service.py
```

## Safety boundary

KneeCo provides clinician-reviewed decision support only. Any anatomy segmentation, physical measurement, OA-related interpretation, or implant candidate must be reviewed and validated by a qualified clinician; it does not replace diagnosis or surgical judgment.
