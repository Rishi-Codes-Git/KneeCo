from fastapi import FastAPI, HTTPException, status

from .config import load_settings
from .contracts import (
    AnalysisBlockedResponse,
    AnalysisRequest,
    HealthResponse,
    ImplantCandidate,
    ImplantRankingRequest,
    ImplantRankingResponse,
    OaClassificationResponse,
    ServiceState,
    StructureState,
    StudyPreflightRequest,
    StudyPreflightResponse,
)
from .oa_classifier import OaClassifier
from .pipeline import decode_study, inspect_image, rank_by_dimension_distance

app = FastAPI(
    title="KneeCo Analysis Service",
    version="0.2.0-preflight-and-ranking",
    description="Image/PDF technical preflight and clinician-initiated implant-candidate ranking. Automatic segmentation stays disabled until a validated model is supplied.",
)


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    settings = load_settings()
    service_state = ServiceState.ready_for_validation if settings.inference_enabled else ServiceState.awaiting_validation_scan
    return HealthResponse(
        state=service_state,
        inference_enabled=settings.inference_enabled,
        model_id=settings.model_id,
        model_version=settings.model_version,
        safe_message=(
            "Image/PDF technical preflight is available. Automatic segmentation and physical measurements remain disabled until a validated model and calibration source are configured."
            if not settings.inference_enabled
            else "Model execution is configured for controlled validation only; clinician review remains required."
        ),
    )


@app.post("/v1/studies/preflight", response_model=StudyPreflightResponse)
def preflight_study(request: StudyPreflightRequest) -> StudyPreflightResponse:
    try:
        decoded = decode_study(
            file_name=request.file_name,
            content_type=request.content_type,
            content_base64=request.content_base64,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    image_quality = inspect_image(decoded.image)
    technically_reviewable = bool(image_quality["passes_technical_review"])
    structure_reason = "A validated segmentation model is not configured; no anatomy has been inferred from this upload."
    return StudyPreflightResponse(
        case_id=request.case_id,
        status="ready_for_validated_model" if technically_reviewable else "review_required",
        input_kind=decoded.input_kind,
        page_count=decoded.page_count,
        file_sha256=decoded.file_sha256,
        image_quality=image_quality,
        structures=[
            StructureState(structure="femur", state="model_not_run", reason=structure_reason),
            StructureState(structure="tibia", state="model_not_run", reason=structure_reason),
            StructureState(structure="medial_meniscus", state="model_not_run", reason=structure_reason),
        ],
        safe_message="Technical preflight completed. No segmentation, meniscus thickness, OA assessment, or millimetre measurement has been generated. A validated model plus physical spacing/calibration is required before those outputs can be shown.",
    )


@app.post("/v1/studies/classify-oa", response_model=OaClassificationResponse)
def classify_oa_stage(request: StudyPreflightRequest) -> OaClassificationResponse:
    settings = load_settings()
    classifier = OaClassifier(settings.oa_model_path)
    if not classifier.available:
        return OaClassificationResponse(
            case_id=request.case_id,
            status="model_unavailable",
            model_id="KneeCo OA MRI Classifier",
            model_version=settings.oa_model_version,
            safe_message="The OA classifier has not been configured for this FastAPI service. No OA stage result was generated.",
        )
    try:
        decoded = decode_study(
            file_name=request.file_name,
            content_type=request.content_type,
            content_base64=request.content_base64,
        )
        result = classifier.classify(decoded.image)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    return OaClassificationResponse(
        case_id=request.case_id,
        status="model_result_for_review",
        model_id="KneeCo OA MRI Classifier",
        model_version=settings.oa_model_version,
        **result,
        safe_message="This is a four-class image-classifier output for clinician review only. It is not a diagnosis and does not provide anatomy segmentation, meniscus thickness, physical measurements, or an implant recommendation.",
    )


@app.post("/v1/implant-candidates", response_model=ImplantRankingResponse)
def rank_implant_candidates(request: ImplantRankingRequest) -> ImplantRankingResponse:
    if not request.clinician_initiated:
        return ImplantRankingResponse(
            case_id=request.case_id,
            status="not_initiated",
            candidates=[],
            safe_message="Implant planning remains inactive until a clinician explicitly initiates it.",
        )

    patient_dimensions = request.bone_dimensions.model_dump(exclude={"measurement_provenance"})
    catalogue = [item.model_dump() for item in request.catalogue]
    ranked = rank_by_dimension_distance(patient_dimensions, catalogue)
    candidates = [
        ImplantCandidate(rank=index + 1, **candidate)
        for index, candidate in enumerate(ranked)
    ]
    return ImplantRankingResponse(
        case_id=request.case_id,
        status="ranked",
        candidates=candidates,
        safe_message="Candidates are ranked only by dimensional proximity using the clinician-supplied catalogue and verified dimensions. This is not an implant recommendation, surgical plan, or substitute for clinical judgment.",
    )


@app.post("/v1/analyses", response_model=AnalysisBlockedResponse, status_code=status.HTTP_409_CONFLICT)
def request_analysis(request: AnalysisRequest) -> AnalysisBlockedResponse:
    settings = load_settings()
    if not settings.inference_enabled:
        return AnalysisBlockedResponse(
            case_id=request.case_id,
            reason="Automatic inference has not been validated on a compatible de-identified T2 knee MRI study, and the supplied archive does not contain trained model weights.",
            next_requirement="Install a trained, versioned segmentation model; validate input compatibility, physical spacing, masks for femur/tibia/medial meniscus, and clinician review before enabling inference.",
        )

    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="A model was marked enabled but no validated segmentation runtime has been installed.",
    )
