export type CaseStatus = "analysis_ready" | "clinician_review" | "report_signed" | "intake_complete";

export type IllustrativeCase = {
  id: string;
  patientLabel: string;
  age: number;
  sex: "Female" | "Male" | "Intersex" | "Not recorded";
  kneeSide: "Left" | "Right" | "Bilateral" | "Not recorded";
  oaStatus: "Known" | "Not recorded" | "Confirmed" | "Not indicated";
  lifestyleContext: string;
  status: CaseStatus;
  statusLabel: string;
  statusNote: string;
  meniscusThickness: string | null;
  updatedAt: string;
  reviewer: string | null;
  sourceStudy?: {
    url: string;
    fileName: string;
    mimeType: string;
  } | null;
  oaClassifierResult?: {
    stageLabel: "Normal" | "MildOA" | "ModerateOA" | "SevereOA";
    topClassProbability: number;
    stageProbabilities: Record<string, number>;
    modelName: string;
    modelVersion: string;
  } | null;
  geminiReportResult?: {
    model: string;
    summary: string | null;
    oaMention: "reported" | "not_reported" | "unclear";
    oaSeverity: string | null;
    femurFinding: string | null;
    tibiaFinding: string | null;
    medialMeniscusFinding: string | null;
    femoralWidthMm: number | null;
    femoralApMm: number | null;
    tibialWidthMm: number | null;
    tibialApMm: number | null;
    medialMeniscusAnteriorMm: number | null;
    medialMeniscusBodyMm: number | null;
    medialMeniscusPosteriorMm: number | null;
    citedReportPhrases: string[];
    reviewNote: string;
  } | null;
  geminiReportState?: {
    status: "not_configured" | "extracted_for_review" | "not_a_report" | "failed";
    message: string;
  } | null;
  geminiVisualReview?: {
    model: string;
    imageQuality: "sufficient_for_visual_review" | "limited" | "not_assessable";
    femur: { visibility: "visible" | "partly_visible" | "not_assessable"; visualDescriptor: string | null };
    tibia: { visibility: "visible" | "partly_visible" | "not_assessable"; visualDescriptor: string | null };
    medialMeniscus: { visibility: "visible" | "partly_visible" | "not_assessable"; visualDescriptor: string | null };
    roughEstimates: {
      scaleDetected: boolean;
      femoralWidthMm: number | null;
      femoralApMm: number | null;
      tibialWidthMm: number | null;
      tibialApMm: number | null;
      medialMeniscusAnteriorMm: number | null;
      medialMeniscusBodyMm: number | null;
      medialMeniscusPosteriorMm: number | null;
    };
    oaVisualAssessment: { status: "features_not_apparent" | "features_possible" | "features_present" | "not_assessable"; descriptor: string };
    implantPlanning: { status: "not_triggered" | "candidate_sizing_preview"; candidateSizeBand: "small" | "medium" | "large" | "not_available"; rationale: string };
    presentationTestOutput?: {
      simulationStatus: "simulated_not_clinical";
      imageId: string;
      syntheticClass: string;
      syntheticOaStatus: "present" | "absent";
      simulatedPlan: {
        procedure: string;
        systemId: string;
        femoralComponent: string | null;
        tibialTray: string | null;
        polyethyleneInsertThicknessMm: number | null;
        patellarDiameterMm: number | null;
        patellarThicknessMm: number | null;
        femoralResectionMm: number | null;
        tibialResectionMm: number | null;
        jointLineAdjustmentMm: number | null;
        fixation: string | null;
      };
    };
    reviewNote: string;
  } | null;
  geminiVisualState?: {
    status: "not_configured" | "not_an_image" | "visible_for_review" | "not_knee_mri_or_unreadable" | "failed";
    message: string;
  } | null;
};

export const illustrativeCases: IllustrativeCase[] = [
  { id: "KC-2026-021", patientLabel: "Patient KR-021", age: 62, sex: "Female", kneeSide: "Right", oaStatus: "Known", lifestyleContext: "Low-impact activity", status: "analysis_ready", statusLabel: "Analysis ready", statusNote: "Automatic structure estimate is ready for clinician review.", meniscusThickness: "3.1 mm", updatedAt: "Today, 11:24", reviewer: null },
  { id: "KC-2026-018", patientLabel: "Patient DM-018", age: 49, sex: "Male", kneeSide: "Left", oaStatus: "Not recorded", lifestyleContext: "Load-bearing occupation", status: "clinician_review", statusLabel: "Review recommended", statusNote: "Boundary confidence needs clinician attention before approval.", meniscusThickness: "2.8 mm", updatedAt: "Today, 09:42", reviewer: null },
  { id: "KC-2026-012", patientLabel: "Patient NP-012", age: 54, sex: "Male", kneeSide: "Right", oaStatus: "Not indicated", lifestyleContext: "Recreational sport", status: "intake_complete", statusLabel: "Intake complete", statusNote: "MRI study is recorded and awaiting analysis workflow availability.", meniscusThickness: null, updatedAt: "21 Aug, 14:15", reviewer: null },
];

export const closedIllustrativeCases: IllustrativeCase[] = [
  { id: "KC-2026-016", patientLabel: "Patient ST-016", age: 68, sex: "Female", kneeSide: "Bilateral", oaStatus: "Confirmed", lifestyleContext: "Moderate activity", status: "report_signed", statusLabel: "Report signed", statusNote: "Clinician-approved measurement and decision-support report are on record.", meniscusThickness: "2.7 mm", updatedAt: "Yesterday, 16:08", reviewer: "Dr. Asha Raman" },
  { id: "KC-2026-010", patientLabel: "Patient AR-010", age: 57, sex: "Male", kneeSide: "Left", oaStatus: "Known", lifestyleContext: "Moderate activity", status: "report_signed", statusLabel: "Report signed", statusNote: "Clinician-approved measurement and decision-support report are on record.", meniscusThickness: "3.0 mm", updatedAt: "19 Aug, 10:32", reviewer: "Dr. Asha Raman" },
  { id: "KC-2026-008", patientLabel: "Patient VV-008", age: 45, sex: "Female", kneeSide: "Right", oaStatus: "Not indicated", lifestyleContext: "Recreational sport", status: "report_signed", statusLabel: "Report signed", statusNote: "Clinician-approved measurement and decision-support report are on record.", meniscusThickness: "3.4 mm", updatedAt: "16 Aug, 15:06", reviewer: "Dr. Asha Raman" },
  { id: "KC-2026-004", patientLabel: "Patient RJ-004", age: 71, sex: "Male", kneeSide: "Bilateral", oaStatus: "Confirmed", lifestyleContext: "Low-impact activity", status: "report_signed", statusLabel: "Report signed", statusNote: "Clinician-approved measurement and decision-support report are on record.", meniscusThickness: "2.5 mm", updatedAt: "11 Aug, 12:18", reviewer: "Dr. Asha Raman" },
];

export function caseDetailPath(caseId: string) {
  return `/cases/${encodeURIComponent(caseId)}`;
}

export function kneeAnalysisPath(caseId: string) {
  return `/cases/${encodeURIComponent(caseId)}/analysis`;
}

export function getIllustrativeCase(caseId: string | null | undefined) {
  return [...illustrativeCases, ...closedIllustrativeCases].find((record) => record.id === caseId) ?? illustrativeCases[0];
}

export function filterIllustrativeCases(records: IllustrativeCase[], query: string, status: "all" | CaseStatus) {
  const normalized = query.trim().toLowerCase();
  return records.filter((record) => {
    const matchesStatus = status === "all" || record.status === status;
    const matchesQuery = !normalized || [record.id, record.patientLabel, record.kneeSide, record.statusLabel].some((value) => value.toLowerCase().includes(normalized));
    return matchesStatus && matchesQuery;
  });
}
