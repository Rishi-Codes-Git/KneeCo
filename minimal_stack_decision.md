# Minimal Stack Decision — AI-Assisted Knee MRI Assessment

## Decision

Use a **two-service application** with managed backend services rather than a complex microservice system:

```text
Next.js clinician app + Supabase (auth, database, file storage)
                         ↓
              FastAPI analysis service
                         ↓
     LiteMedSAM interactive segmentation + measurement module
```

This is the most practical way to build quickly while retaining a genuine image-processing path. It keeps the product UI, authentication, case records, and MRI-file storage simple, while putting the only Python/ML component in one isolated service.

## Exact stack to use

| Concern | Selected technology | Reason |
|---|---|---|
| Product UI | **Next.js + TypeScript** | One polished React application for login, dashboard, new case, analysis review, and report pages. |
| Visual system | **Tailwind CSS + shadcn/ui** | Fast implementation of the supplied logo, palette, responsive layouts, forms, tables, drawers, and status components. |
| Forms / validation | **React Hook Form + Zod** | Reliable signup and case-intake validation with little custom code. |
| Authentication | **Supabase Auth** | Avoids building password reset, sessions, and signup security from scratch. |
| Case database | **Supabase PostgreSQL** | Stores doctors, cases, demographics, analysis jobs, clinician edits, reports, consent, and audit records. |
| MRI / report file storage | **Supabase Storage** | Stores original DICOM, converted preview image, masks/overlays, and final report without storing file bytes in the database. |
| Data access | **Supabase SDK + row-level security** | Keeps doctors restricted to their own cases without writing a full custom CRUD API. |
| Analysis API | **FastAPI + Pydantic** | One concise Python service for upload verification, image conversion, AI segmentation, measurement, and result JSON. |
| MRI processing | **pydicom + NumPy + Pillow + OpenCV** | Reads DICOM and physical spacing, creates browser preview images, renders overlays, and calculates mask geometry. |
| ML model | **LiteMedSAM** | A publicly documented, pretrained medical-image segmentation route intended for interactive prompt/box-guided segmentation; its official project provides inference guidance and LiteMedSAM as a faster variant. It must be presented as clinician-assisted, not validated autonomous knee analysis. [1] |
| Measurement | **Custom NumPy/OpenCV geometry module** | Takes an approved medial-meniscus mask and DICOM `PixelSpacing` to calculate a reproducible thickness in millimetres and draw the line on the preview. |
| Analytics | **SQL views / Supabase queries + Recharts** | Shows actual aggregate case distributions by age band, sex, known OA status, and lifestyle category once cases exist. |
| Report | **React print layout + `react-to-print`** | A one-page report downloadable from the browser without a separate PDF microservice. |
| Local DevOps | **Docker Compose** for FastAPI analysis service; Next.js and Supabase local development | Reproducible setup without unnecessary Kubernetes or queue infrastructure. |
| Checks | **GitHub Actions** | Runs TypeScript checks, unit tests, API tests, and container build after each merge. |

## Why this is better than a PyTorch/MONAI deployment right now

The supplied archive has no usable trained model. Training a knee-specific segmentation model now is not a fast or defensible option. A full PyTorch/MONAI inference environment would also increase container size and setup risk.

LiteMedSAM gives a **real pretrained ML step now**, but uses clinician-created bounding boxes. The doctor draws one bounding box around the femur, tibia, and medial-meniscus target on a 2D MRI slice. The model returns an editable mask for each target. This matches the product claim: **AI-assisted segmentation with clinician control**. It does not require us to claim that the system autonomously diagnosed OA or automatically identified every structure.

> The only safe claim is: “A pretrained, prompt-guided medical segmentation model assists contour creation; the clinician reviews the resulting masks and measurements.”

## What the current Python files can and cannot do

| Current file capability | Can we retain it? | Correct usage |
|---|---:|---|
| Case-ID-based synthetic OA label | Yes | Use only in an isolated **demo simulation mode** for the provided educational cases. |
| Synthetic explanatory message | Yes | Use only with an explicit “Simulation—Not Model Output” badge. |
| Image upload analysis | No | The scripts do not read uploaded pixels or create any image-derived result. |
| Femur/tibia/meniscus masks | No | Replace with the LiteMedSAM segmentation service. |
| Meniscus thickness in mm | No | Replace with a DICOM-spacing-aware measurement module. |
| Demographic analysis | No | Implement separately through actual database aggregation. |

## Minimal image-analysis flow

```text
Doctor uploads DICOM MRI
        ↓
FastAPI validates DICOM, modality, and pixel spacing
        ↓
FastAPI renders the selected sagittal slice as a browser preview
        ↓
Doctor places three bounding boxes: femur, tibia, medial meniscus
        ↓
LiteMedSAM returns one mask for each prompted structure
        ↓
Doctor inspects / edits masks and selects measurement location
        ↓
Measurement module calculates meniscus thickness in mm
using mask geometry + DICOM pixel spacing
        ↓
Quality rules create a “review required” warning when metadata,
mask size, or contour continuity is insufficient
        ↓
Doctor approves or edits measurement
        ↓
Approved result, demographics, context, and disclaimer enter report
```

The system can honestly provide an image-derived measurement only when it receives **DICOM physical pixel spacing**. If a user uploads only PNG/JPG, the app should either reject it for final measurement or label any result as **uncalibrated pixel measurement—not millimetres**. This is a necessary safety and engineering rule.

## Required analysis-result contract

The frontend should depend only on this stable response structure, not directly on ML code:

```json
{
  "analysis_mode": "interactive_pretrained_segmentation",
  "model_name": "LiteMedSAM",
  "model_version": "recorded-at-deploy",
  "scan_quality": "review_required",
  "quality_reasons": ["Clinician confirmation required for meniscus contour."],
  "pixel_spacing_mm": [0.42, 0.42],
  "structures": {
    "femur": {"mask_url": "...", "review_status": "pending"},
    "tibia": {"mask_url": "...", "review_status": "pending"},
    "medial_meniscus": {"mask_url": "...", "review_status": "pending"}
  },
  "measurement": {
    "name": "medial_meniscus_thickness",
    "value_mm": 3.1,
    "method": "shortest_contour_distance_at_clinician_selected_location",
    "status": "pending_clinician_approval"
  }
}
```

The clinical system must save the original AI-assisted result and the clinician-approved value separately, including reviewer, timestamp, correction reason, model version, and quality flags.

## Demographics, lifestyle, and analytics

Age, sex, known OA status, and lifestyle should be collected as context, but must never overwrite the image measurement. The report should say that context is descriptive and the measurement is image-derived after clinician review.

| Field | Product use now | What not to claim |
|---|---|---|
| Age | Group cases into bands, e.g. 18–39, 40–59, 60+ | Do not infer OA from age alone. |
| Sex | Filter and compare approved measurements across cases | Do not adjust an individual’s thickness merely because of sex. |
| Known OA status | Distinguish clinician-entered OA / non-OA / unknown cases | Do not relabel it based on the app. |
| Lifestyle | Optional activity-level or load-bearing-work context | Do not convert it into a risk diagnosis. |

The dashboard analytics should initially show only true counts and measurements from saved, clinician-approved cases. If too few cases exist, show **“Insufficient cohort data for comparison”** rather than inventing a baseline.

## Report contents

1. Case ID and scan metadata.
2. Patient context: age, sex, known OA status, optional lifestyle field.
3. Segmentation image with clinician-reviewed overlays.
4. Medial-meniscus thickness in mm and named measurement location.
5. Quality / uncertainty note and model mode.
6. Clinician approval or edited-value record.
7. The exact required statement: **“decision support only—not a final diagnosis”.**

## What we will build first

| Order | Deliverable | Why it comes first |
|---:|---|---|
| 1 | Next.js shell, brand tokens, auth, dashboard, and `Add New Scan` flow | Gives the team a usable product skeleton immediately. |
| 2 | Supabase schema: users, doctors, cases, analyses, reviews, consent/audit | Makes every later feature persist correctly. |
| 3 | DICOM upload and FastAPI validation/preview endpoint | Establishes real MRI input and physical-spacing data. |
| 4 | Interactive boxes → LiteMedSAM masks → overlay preview | Introduces a real but clinician-guided AI feature. |
| 5 | Measurement, approval/edit, uncertainty rules, and report | Turns the demo into a safe clinician workflow. |
| 6 | Analytics cards/charts from saved approved results | Adds demographic and lifestyle context without inventing clinical conclusions. |

## Scope boundaries

Do not claim a fully automatic medial-meniscus measurement, autonomous OA diagnosis, clinical validation, or training from uploads. Build an explicit optional research-consent flow for future de-identified, clinician-annotated data collection. Only after a curated dataset and formal evaluation should the project train a knee-specific multi-class model; then replace LiteMedSAM prompts with an automatic segmentation model through the same analysis-result contract.

## Recommendation

Approve the stack above and start with a clinician-assisted MRI workflow. It is minimal, fast to create, visually polished, and technically real. The exact innovation is **Human-in-the-Loop MRI Segmentation**: the AI accelerates contouring and measurement; the clinician owns the final result; the system records quality and consent for future knee-specific model training.

## References

[1]: https://github.com/bowang-lab/medsam "MedSAM — Segment Anything in Medical Images"
