# Supplied Model Archive — Verified Initial Findings

**Inspection date:** 2026-08-22

The supplied archive does **not** contain trained model weights, model configuration, a segmentation pipeline, DICOM data, masks, pixel-spacing metadata, or a measurement engine. It contains a synthetic educational presentation package, four deterministic simulation-result JSON files, and Python scripts that select pre-authored labels from case metadata.

The included scripts explicitly mark their own output as `PRESENTATION_SIMULATION`, `is_clinical_diagnosis: false`, and `is_trained_medical_model_output: false`. Their validation JSON explicitly scopes validation as “Presentation simulation only; not clinical validation.” The scripts also lack the expected `Path` import, so they are not presently executable without correction.

The nested case package contains PNG/JPEG illustrative images, including a sagittal knee MRI-style image and an educational OA reference. The images do not include model-generated femur, tibia, or medial-meniscus segmentation masks, measurement lines, DICOM series, or patient-scale metadata. The package documentation states that the assets are synthetic/educational visuals, not real patient studies, training data, clinical ground truth, or diagnostic evidence.

**Immediate architectural implication:** The package is useful only as a clearly labelled presentation/demo-data source. It cannot produce the required Phase 1 output of femur/tibia/medial-meniscus segmentation and medial-meniscus thickness measurement. The system needs a distinct AI processing foundation with data ingestion, preprocessing, segmentation, calibration/pixel spacing, measurement geometry, confidence estimation, human-review/audit logic, and validation evidence.

## External model-path check

Two publicly documented repositories were reviewed as potential fast model sources. `akshaysc/msk_segmentation` describes cartilage and meniscus segmentation for 3D DESS OAI MRI, but its 400 MB weights are not directly distributed and the repository itself lists preprocessing as planned. `doscsy12/knee_mri_proj` is a knee MRI classification/meniscus-tear experiment, not a femur/tibia/medial-meniscus segmentation-and-measurement model; it does not document accessible pretrained inference and reports moderate validation performance. Neither is suitable as an immediate drop-in model for the Phase 1 required outputs.

## Revised automatic-model finding

The public `aagatti/nnunet_knee` model card on Hugging Face documents a directly available nnU-Net v2 cascade for automatic 9-class T2-weighted knee-MRI segmentation. Its declared labels include medial meniscus, lateral meniscus, femur bone, and tibia bone. The model card reports NIfTI/NRRD input, an approximate 80-second inference time per volume, and self-reported test metrics; it is MIT-licensed. This is a materially better fit for Phase 1 automatic first-pass segmentation than a prompt-guided model. Its self-reported performance must be presented as model-card evidence, not as clinical validation of this product. The product must validate DICOM-to-NIfTI conversion, model compatibility, output quality, and clinician review before use in reports.
