from fastapi import FastAPI, HTTPException, status

from .config import load_settings
from .contracts import AnalysisBlockedResponse, AnalysisRequest, HealthResponse, ServiceState

app = FastAPI(
    title="KneeCo Analysis Service",
    version="0.1.0-model-ready",
    description="Model-ready automatic knee-MRI analysis service. Inference is disabled until validation data is available.",
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
            "Automatic MRI inference is disabled until a compatible de-identified T2 knee MRI study validates the full pipeline."
            if not settings.inference_enabled
            else "Inference is enabled for controlled validation only; clinical use remains unsupported."
        ),
    )


@app.post("/v1/analyses", response_model=AnalysisBlockedResponse, status_code=status.HTTP_409_CONFLICT)
def request_analysis(request: AnalysisRequest) -> AnalysisBlockedResponse:
    settings = load_settings()
    if not settings.inference_enabled:
        return AnalysisBlockedResponse(
            case_id=request.case_id,
            reason="Automatic inference has not been validated on a compatible de-identified T2 knee MRI study.",
            next_requirement="Validate DICOM-to-NIfTI conversion, automatic segmentation, physical spacing, and clinician review before enabling inference.",
        )

    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="The model runtime is intentionally not installed until controlled validation is approved.",
    )
