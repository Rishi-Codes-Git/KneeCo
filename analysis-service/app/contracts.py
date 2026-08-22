from enum import Enum
from pydantic import BaseModel, Field


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
