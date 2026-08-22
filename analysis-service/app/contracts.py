from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class AnalysisMode(str, Enum):
    automatic_model = "automatic_model"
    demo_simulation = "demo_simulation"


class ServiceState(str, Enum):
    awaiting_validation_scan = "awaiting_validation_scan"
    ready_for_validation = "ready_for_validation"
    validated = "validated"


class HealthResponse(BaseModel):
    service: str = "kneeco-analysis-service"
    state: ServiceState
    inference_enabled: bool
    model_id: str
    model_version: str
    expected_input: str = "De-identified T2 knee MRI volume"
    safe_message: str


class AnalysisRequest(BaseModel):
    case_id: str = Field(min_length=1, max_length=100)
    source_file_reference: str = Field(min_length=1)
    mode: AnalysisMode = AnalysisMode.automatic_model


class AnalysisBlockedResponse(BaseModel):
    case_id: str
    status: str = "blocked"
    reason: str
    next_requirement: str


class StudyPreflightRequest(BaseModel):
    case_id: str = Field(min_length=1, max_length=100)
    file_name: str = Field(min_length=5, max_length=255)
    content_type: str = Field(min_length=3, max_length=120)
    content_base64: str = Field(min_length=1, max_length=28_000_000)


class StructureState(BaseModel):
    structure: Literal["femur", "tibia", "medial_meniscus"]
    state: Literal["model_not_run", "model_ready"]
    detected: bool = False
    reason: str


class StudyPreflightResponse(BaseModel):
    case_id: str
    status: Literal["ready_for_validated_model", "review_required"]
    input_kind: Literal["image", "pdf"]
    page_count: int | None
    file_sha256: str
    image_quality: dict[str, float | int | bool | list[str]]
    calibration_status: Literal["not_provided"] = "not_provided"
    mm_measurement_eligible: bool = False
    structures: list[StructureState]
    model_execution: Literal["not_run"] = "not_run"
    requires_clinician_review: bool = True
    safe_message: str


class BoneDimensions(BaseModel):
    femoral_width_mm: float = Field(gt=0, le=200)
    femoral_ap_mm: float = Field(gt=0, le=200)
    tibial_width_mm: float = Field(gt=0, le=200)
    tibial_ap_mm: float = Field(gt=0, le=200)
    measurement_provenance: Literal["validated_model_with_physical_spacing", "clinician_verified"]


class ImplantCatalogueItem(BaseModel):
    manufacturer: str = Field(min_length=1, max_length=80)
    system: str = Field(min_length=1, max_length=80)
    size: str = Field(min_length=1, max_length=30)
    femoral_width_mm: float = Field(gt=0, le=200)
    femoral_ap_mm: float = Field(gt=0, le=200)
    tibial_width_mm: float = Field(gt=0, le=200)
    tibial_ap_mm: float = Field(gt=0, le=200)


class ImplantRankingRequest(BaseModel):
    case_id: str = Field(min_length=1, max_length=100)
    clinician_initiated: bool
    bone_dimensions: BoneDimensions
    catalogue: list[ImplantCatalogueItem] = Field(min_length=1, max_length=100)


class ImplantCandidate(BaseModel):
    rank: int
    manufacturer: str
    system: str
    size: str
    dimensional_proximity_score: float
    normalized_rms_error: float


class ImplantRankingResponse(BaseModel):
    case_id: str
    status: Literal["ranked", "not_initiated"]
    candidates: list[ImplantCandidate]
    requires_clinician_review: bool = True
    safe_message: str
