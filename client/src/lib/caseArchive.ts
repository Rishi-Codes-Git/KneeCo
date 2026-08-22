export type CaseStatus = "analysis_ready" | "clinician_review" | "report_signed" | "intake_complete";

export type IllustrativeCase = {
  id: string;
  patientLabel: string;
  age: number;
  sex: "Female" | "Male" | "Not recorded";
  kneeSide: "Left" | "Right" | "Bilateral";
  oaStatus: "Known" | "Not recorded" | "Confirmed" | "Not indicated";
  lifestyleContext: string;
  status: CaseStatus;
  statusLabel: string;
  statusNote: string;
  meniscusThickness: string | null;
  updatedAt: string;
  reviewer: string | null;
};

export const illustrativeCases: IllustrativeCase[] = [
  { id: "KC-2026-021", patientLabel: "Patient KR-021", age: 62, sex: "Female", kneeSide: "Right", oaStatus: "Known", lifestyleContext: "Low-impact activity", status: "analysis_ready", statusLabel: "Analysis ready", statusNote: "Automatic structure estimate is ready for clinician review.", meniscusThickness: "3.1 mm", updatedAt: "Today, 11:24", reviewer: null },
  { id: "KC-2026-018", patientLabel: "Patient DM-018", age: 49, sex: "Male", kneeSide: "Left", oaStatus: "Not recorded", lifestyleContext: "Load-bearing occupation", status: "clinician_review", statusLabel: "Review recommended", statusNote: "Boundary confidence needs clinician attention before approval.", meniscusThickness: "2.8 mm", updatedAt: "Today, 09:42", reviewer: null },
  { id: "KC-2026-016", patientLabel: "Patient ST-016", age: 68, sex: "Female", kneeSide: "Bilateral", oaStatus: "Confirmed", lifestyleContext: "Moderate activity", status: "report_signed", statusLabel: "Report signed", statusNote: "Clinician-approved measurement and decision-support report are on record.", meniscusThickness: "2.7 mm", updatedAt: "Yesterday, 16:08", reviewer: "Dr. Asha Raman" },
  { id: "KC-2026-012", patientLabel: "Patient NP-012", age: 54, sex: "Male", kneeSide: "Right", oaStatus: "Not indicated", lifestyleContext: "Recreational sport", status: "intake_complete", statusLabel: "Intake complete", statusNote: "MRI study is recorded and awaiting analysis workflow availability.", meniscusThickness: null, updatedAt: "21 Aug, 14:15", reviewer: null },
];

export function caseDetailPath(caseId: string) {
  return `/cases/${encodeURIComponent(caseId)}`;
}

export function kneeAnalysisPath(caseId: string) {
  return `/cases/${encodeURIComponent(caseId)}/analysis`;
}

export function getIllustrativeCase(caseId: string | null | undefined) {
  return illustrativeCases.find((record) => record.id === caseId) ?? illustrativeCases[0];
}

export function filterIllustrativeCases(records: IllustrativeCase[], query: string, status: "all" | CaseStatus) {
  const normalized = query.trim().toLowerCase();
  return records.filter((record) => {
    const matchesStatus = status === "all" || record.status === status;
    const matchesQuery = !normalized || [record.id, record.patientLabel, record.kneeSide, record.statusLabel].some((value) => value.toLowerCase().includes(normalized));
    return matchesStatus && matchesQuery;
  });
}
