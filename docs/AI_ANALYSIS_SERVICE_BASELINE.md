# KneeCo AI Analysis Service Baseline

KneeCo will keep clinical workflow software independent from model implementation. The product calls one analysis-service endpoint after a DICOM MRI upload. That service validates the study, converts a compatible series into the model input format, runs automatic first-pass segmentation for femur, tibia, and medial meniscus, calculates thickness from a reviewed mask and physical image spacing, and returns `KneeAnalysisResult` from `shared/analysisContract.ts`.

The initial integration target is an automatic, pretrained knee-MRI segmentation worker. The worker must remain isolated from the core web API because model processing may take longer than an ordinary request. It must return `automatic_model` only when real image pixels are processed. Any supplied educational or synthetic archive must return `demo_simulation` and must never be represented as an image-derived measurement.

The core application will create a report only after the clinician reviews the result. The report must preserve the model version, quality status, original result, clinician-approved value, reviewer, timestamp, and the statement: “decision support only—not a final diagnosis”.

Before enabling an external analysis worker, provide its base URL as `AI_SERVICE_URL` and run a health check. The application must not store this URL in frontend code or expose its credentials to the browser.
