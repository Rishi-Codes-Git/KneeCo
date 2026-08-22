# Phase 1 Model Assessment and Integrated Technical Stack

**Scope:** AI-assisted assessment of the femur, tibia, and medial meniscus from knee MRI, with a clinician-review workflow.  
**Decision status:** **Do not finalize the application stack or start development until the team reviews this assessment.**

## Executive decision

The supplied archive is **not a trained AI model** and cannot deliver the required Phase 1 outputs. It is a presentation-simulation package containing synthetic/educational image assets, deterministic scripts, and pre-authored OA-associated labels. The archive itself says that its output is not a clinical diagnosis and not trained medical-model output.

It is still useful as a clearly labelled **demo-data and UI-flow package**, but it must not be presented as the AI engine. The project should therefore include a complete **AI Processing Foundation**: a model-ready ingestion, segmentation, measurement, confidence, clinician-review, and consented-data pipeline. This foundation is the correct technical base for an honest first release and for future model training.

> **Presentation-safe statement:** “The current release contains a model-ready AI processing foundation and a simulated educational demonstration dataset. It does not claim a clinically validated diagnostic model. The architecture records clinician-reviewed, consented, de-identified data to support future model development and validation.”

## Verified archive evidence

| Required evidence | Found in supplied archive? | What was verified |
|---|---:|---|
| Trained model weights (`.pt`, `.pth`, `.onnx`, TensorFlow model, etc.) | No | Archive inventory has no model-weight artifact. |
| Model architecture/configuration | No | No network configuration, class map, checkpoint, or inference dependency manifest is included. |
| Genuine inference from image pixels | No | Scripts select a simulated label by case ID from JSON metadata rather than processing image pixels. |
| Femur segmentation mask | No | No mask files or mask-generation code are present. |
| Tibia segmentation mask | No | No mask files or mask-generation code are present. |
| Medial-meniscus segmentation mask | No | No mask files or mask-generation code are present. |
| Meniscus thickness measurement in millimetres | No | No pixel-spacing metadata, calibration logic, measurement geometry, or unit conversion is present. |
| DICOM MRI study/series ingestion | No | Assets are PNG/JPEG images rather than DICOM study data. |
| Clinical validation evidence | No | Included validation explicitly states “Presentation simulation only; not clinical validation.” |
| Synthetic presentation cases | Yes | Four case IDs, illustrative MRI/CT-like images, and pre-authored simulated findings are included. |
| Human-review safety flags | Yes | The result format sets `requires_doctor_review: true` and states that it is not a clinical diagnosis. |

The archive also contains Python scripts with an unresolved missing `Path` import. This confirms that the package should be treated as supporting presentation material, not production-capable inference software.

## Fit against Phase 1 requirements

| Phase 1 requirement | Current archive status | Required solution |
|---|---|---|
| Analyse femur and tibia | Not supported | Multi-class segmentation component. |
| Locate medial meniscus | Not supported | Medial-meniscus segmentation and anatomy-location validation. |
| Measure medial-meniscus thickness | Not supported | Pixel-spacing-aware geometric measurement engine. |
| Analyse in relation to age, sex, and lifestyle | Simulated text only | Structured context fields and cohort-analysis layer; these must not alter the image measurement. |
| Detect unclear images / AI uncertainty | Placeholder confidence only | Quality checks, model confidence, out-of-distribution safeguards, and clinician-review rules. |
| Clinician edits and approval | Not supported | Persist original result, edit reason, approver, timestamp, and final status. |
| Generate decision-support report | Not supported | Report service with immutable audit reference and required disclaimer. |

## Recommended architecture: application core plus AI Processing Foundation

```text
Doctor → React clinical app → FastAPI Core API → PostgreSQL
          |                         |               |
          |                         |               └─ user, case, review, consent, audit metadata
          |                         |
          |                         └─ object-storage references for MRI, overlays, reports
          |
          └───────────────→ Analysis Job API → Redis queue → AI Processing Worker
                                                            |
                                                            ├─ MRI/DICOM validation + de-identification gate
                                                            ├─ image pre-processing + quality checks
                                                            ├─ segmentation adapter (current: model-ready stub)
                                                            ├─ measurement engine (mm from DICOM pixel spacing)
                                                            ├─ uncertainty / review rules
                                                            └─ structured result + overlays
```

The **Core API** is always lightweight. It never runs a neural network in a normal clinician request. The **AI Processing Worker** is independent: initially it can run a demo adapter that returns explicitly labelled simulation output; later it can load a validated ONNX model or use a GPU-based model worker without changing the UI, API, database, or report workflow.

## AI Processing Foundation: what must exist before the model

| Component | Responsibility | What we can build now | What a trained model later adds |
|---|---|---|---|
| Ingestion gate | Accept MRI only; validate file/type/series; record case metadata | MRI/DICOM upload policy, safe storage, format validation | Broader modality/series support if clinically justified. |
| De-identification and consent gate | Prevent unapproved scans from entering a training pool | Consent status, contributor agreement, de-identification status, access restriction | Auditable labelled-data pipeline. |
| Pre-processing | Normalize orientation/intensity; choose the relevant slice/series; retain spacing | Reproducible preprocessing contract and logs | Production preprocessing matched to model training. |
| Segmentation adapter | Produce femur, tibia, and medial-meniscus masks | Stable interface with simulated/demo adapter only | A trained multi-class segmentation model. |
| Measurement engine | Turn masks and physical image spacing into repeatable measurements | Input/output contract, named measurement locations, reviewer override | Computes physical thickness from true masks and DICOM spacing. |
| Quality and uncertainty | Decide when to request clinician inspection | Rules for missing metadata, invalid study, low-quality input, and simulation mode | Model confidence calibration and out-of-distribution detection. |
| Clinical review/audit | Preserve human authority and traceability | Review status, edits, reviewer, timestamp, reason, report revision | Enables clinical validation and safer real-world use. |
| Data feedback loop | Curate data for future training | Opt-in contribution record and annotation status | Clinician-labelled data becomes a governed training/validation set. |

## Integrated technology stack

| Layer | Initial implementation | Why it is selected | Scalable evolution |
|---|---|---|---|
| Clinician application | React, TypeScript, Vite, Tailwind CSS, shadcn/ui | Fast, polished, typed UI for login, dashboard, new case, review, and report. | Static CDN hosting; horizontal scale is uncomplicated. |
| Forms and data table | React Hook Form, Zod, TanStack Query, TanStack Table | Reliable validation and responsive case workflow. | No architectural change required. |
| DICOM viewer | Canvas-based image review first; Cornerstone3D adapter when series viewing is needed | Keeps the early application light while preserving a clinical-imaging path. | Lazy-loaded Cornerstone3D for multi-slice DICOM interaction. |
| Core API | FastAPI, Pydantic, SQLAlchemy, Alembic | Python fits image services and provides clean typed APIs. | Multiple stateless API instances behind a load balancer. |
| Authentication | JWT session flow, Argon2 password hashing, role model: doctor/admin | Appropriate for a controlled hackathon prototype. Licence upload remains optional and explicitly unverified. | Enterprise SSO/OIDC and verified institutional accounts. |
| Database | PostgreSQL | Stores only metadata: doctors, cases, demographics, consent, analysis jobs, measurements, reviews, and audit events. | Managed PostgreSQL with backups, encryption, read replicas if needed. |
| File storage | Local MinIO for development; S3-compatible object storage for deployment | Raw MRI and generated overlays stay outside the database. | Direct signed uploads and lifecycle policies. |
| Job queue | Redis + RQ | Simple asynchronous analysis jobs; prevents MRI processing from blocking the API. | More workers or a managed queue as demand grows. |
| Medical-image intake | pydicom, NumPy, Pillow; SimpleITK only if 3D series operations are required | Starts lean and supports DICOM metadata and image conversion. | Full 3D preprocessing pipeline once validated. |
| Segmentation research/training | PyTorch + MONAI in a separate research/training environment | Medical-imaging-friendly training tools; isolated from the deployed application. | Train/version/validate multi-class model; export to ONNX. |
| Inference serving | Model-ready worker now; ONNX Runtime worker after a validated model exists | Keeps deployed inference efficient and avoids shipping training dependencies in the core application. | Dedicated CPU/GPU workers scaled independently. |
| Measurement and overlay | NumPy + OpenCV | Generates overlays, contours, measurement lines, and measurement metadata. | Uses true model masks and DICOM physical spacing. |
| Report generation | HTML/CSS report view with browser PDF export | Lightweight one-page report; easy to version and test. | Signed server-generated PDF if required. |
| Local orchestration | Docker Compose | Reproducible team setup: frontend, API, worker, PostgreSQL, Redis, MinIO. | Kubernetes is not needed until scale genuinely requires it. |
| CI/CD and quality | GitHub Actions: frontend type-check, backend tests, API contract tests, container build | Practical DevOps proof without complexity. | Add security scanning, migration checks, model-package verification. |

## Mandatory data and audit model

The database must preserve both AI and human decisions. The essential entities are below.

| Entity | Essential fields |
|---|---|
| `doctor` | name, clinic name, email, role, licence-file reference (optional), licence-verification status |
| `case` | generated case ID, doctor ID, age, sex, known OA status, optional lifestyle context, MRI storage reference, consent status |
| `analysis_job` | case ID, status, processing version, input hash, started/completed timestamps, error reason |
| `analysis_result` | model/adapter version, mode (`simulation` or `model`), quality status, confidence, overlays, original measurement, measurement method |
| `clinical_review` | original AI result, edited value, approval/rejection, review reason, doctor ID, timestamp |
| `training_consent` | explicit opt-in, de-identification confirmation, permitted research use, consent timestamp, withdrawal state |
| `audit_event` | actor, event type, entity reference, timestamp, immutable summary |

Age, sex, and lifestyle remain **context variables**. They must be used for stratified reporting and research comparison only; they must not be used to fabricate or silently alter an image-derived thickness measurement.

## Data-collection and future-training path

Doctors may voluntarily contribute cases only through a separate, explicit consent flow. This does not make the uploaded data automatically suitable for training.

```text
Doctor opts in → data is de-identified → annotation request is created
→ qualified reviewer validates segmentation/measurement labels
→ approved dataset split into training / validation / held-out test sets
→ model is trained, versioned, evaluated, and only then promoted to inference
```

The application should initially show these cases as **“Contributed for research — awaiting annotation”**, not as “used to train the AI.” A clinician-approved ground-truth process is required before training claims are credible.

## First-review behaviour

The demonstration can be fully functional without false claims:

1. A doctor signs in, creates a case, and uploads/selects an MRI demo asset.
2. The system validates case metadata and creates an asynchronous analysis job.
3. The worker returns a result with `mode: simulation`, synthetic/educational asset provenance, and compulsory clinician review.
4. The app displays the simulated image and uses an explicit **“Demo simulation—not trained model output”** status.
5. The clinician may save context and a review record; the final report always includes **“decision support only—not a final diagnosis.”**
6. The architecture screen or technical explanation shows the exact insertion point where a validated segmentation model returns masks and physical measurements.

This preserves trust. Do **not** show a simulated OA label as a real analysis result, do **not** display fake millimetre values, and do **not** label the archive as an AI model.

## Feasibility decision

| Decision | Outcome |
|---|---|
| Can the supplied archive alone produce required Phase 1 output? | **No.** |
| Is it acceptable as a transparent demonstration-data package? | **Yes, if clearly labelled as a synthetic simulation.** |
| Can the full clinical application foundation be built now? | **Yes.** |
| Can the AI architecture foundation be built now? | **Yes.** The segmentation adapter, job flow, measurement contract, quality gates, data governance, and review/audit layer can all be real software before a model exists. |
| Should the team claim a medically trained or clinically validated AI model? | **No.** Not from the supplied archive. |
| What is the winning technical story? | A clinician-first, model-ready knee MRI platform with transparent uncertainty, human approval, and a governed pathway from voluntarily contributed, de-identified scans to clinician-annotated training data. |

## Recommended decision before development

Approve this revised stack only if the team agrees to separate the labels **“simulation,” “model-ready,” “trained model,” and “clinically validated”** everywhere in the UI, API, report, and pitch. The next technical task is to define the exact analysis-result contract and then create the database schema and API endpoints around that contract.
