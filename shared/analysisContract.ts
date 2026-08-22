/**
 * Stable contract between the clinician application and the future knee-MRI
 * analysis service. It deliberately avoids implementation details so a
 * validated automatic model can replace the initial adapter without page rewrites.
 */
export type AnalysisStatus = "queued" | "processing" | "ready_for_review" | "failed";
export type AnalysisMode = "automatic_model" | "demo_simulation";
export type StructureName = "femur" | "tibia" | "medial_meniscus";

export interface StructureSegmentation {
  structure: StructureName;
  maskUrl: string | null;
  confidence: number | null;
  detected: boolean;
}

export interface MeniscusMeasurement {
  valueMm: number | null;
  location: string | null;
  method: "mask_geometry_with_physical_spacing" | "unavailable";
  measurementLine: { start: [number, number]; end: [number, number] } | null;
}

export interface KneeAnalysisResult {
  status: AnalysisStatus;
  mode: AnalysisMode;
  modelName: string;
  modelVersion: string;
  overlayUrl: string | null;
  structures: StructureSegmentation[];
  meniscusMeasurement: MeniscusMeasurement;
  qualityStatus: "pass" | "review_required" | "unusable";
  qualityReasons: string[];
  requiresClinicianReview: boolean;
}
