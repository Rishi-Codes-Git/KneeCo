# Open Knee MRI Model Compatibility Note

**Source reviewed:** [aagatti/nnunet_knee model card](https://huggingface.co/aagatti/nnunet_knee), accessed 23 August 2026.

The referenced open model is documented as an nnU-Net v2 cascade for 3D knee MRI segmentation. Its documented input is a **T2-weighted knee MRI volume** in **NIfTI (`.nii.gz`) or NRRD (`.nrrd`)** format, rather than an arbitrary 2D JPG, PNG, or PDF. Its listed classes include medial meniscus, lateral meniscus, femur bone, and tibia bone. The model card reports self-described evaluation metrics and approximately 80-second inference per volume; these claims have not been independently validated by KneeCo.

KneeCo's current JPG/JPEG/PNG/PDF intake can therefore perform technical preflight only. It must not invoke this 3D model or emit segmentation, millimetre values, or OA-related claims until a compatible 3D study, model runtime, physical-spacing workflow, and clinician review validation are available.

The user-supplied `pasted_file_tSXFRW_Model.zip` was separately inspected. It contains scripts and validation metadata that explicitly identify the archive as a **presentation simulation**, including `is_trained_medical_model_output: false`; it does not include Keras weights, a trained segmentation model, or a validated measurement pipeline.
