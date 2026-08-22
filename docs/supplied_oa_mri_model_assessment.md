# Supplied OA MRI Model Assessment

**Archive:** `OA_MRI_Project(2).zip`  
**Assessment date:** 23 August 2026

## Verified contents

The package contains two loadable Keras 3 artifacts. `oa_model_final.keras` is a 4,845,991-parameter image classifier with input shape `[batch, 224, 224, 3]` and output shape `[batch, 4]`. Its declared class names are `Normal`, `MildOA`, `ModerateOA`, and `SevereOA`. `feature_extractor.keras` accepts the same image input and produces a 1,280-dimensional embedding suitable for similarity tooling, not anatomical measurement.

The classifier was safely deserialized with `compile=False` and `safe_mode=True` using TensorFlow CPU 2.21.0. A controlled endpoint test using an MRI PNG produced a four-class probability vector summing to 1.0. This verifies package loading and execution; it does **not** validate diagnostic performance.

| Required KneeCo capability | Package evidence | Integration decision |
| --- | --- | --- |
| 2D image/PDF preprocessing | 224×224 RGB classifier input; FastAPI decoder verified | Supported through FastAPI preprocessing. |
| Four-stage OA image-classifier output | Full classifier weights and class labels are included | Integrated as a **review-only** probability response. |
| Similarity embeddings | 1,280-dimensional feature extractor and vector matrix are included | Deferred; no patient similarity result is exposed yet. |
| Femur/tibia segmentation | No masks, segmentation classes, or segmentation architecture | Not supported. |
| Medial-meniscus extraction/thickness | No masks, location annotations, or physical-spacing implementation | Not supported. |
| Implant sizing | No verified bone dimension model or manufacturer catalogue | Only clinician-supplied dimensional ranking is supported. |

## Validation evidence supplied

The archive contains only one visible training-log epoch. It does not include a held-out test report, per-class metrics, MRI sequence/orientation specification, calibration evidence, patient-level split documentation, external validation, or clinical validation. Consequently, KneeCo must display its result as **classifier output for clinician review**, not a diagnosis or an OA confirmation.

## FastAPI integration status

KneeCo now has `POST /v1/studies/classify-oa`, which accepts an image or the first page of a PDF, preprocesses it to 224×224 RGB, and returns the raw class probabilities only if `KNEECO_OA_MODEL_PATH` points to the supplied `oa_model_final.keras` artifact. The model file is intentionally kept outside the web project and must be deployed with a Python-capable inference service rather than the Node web runtime.
