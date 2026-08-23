export type CaseCreationFeedbackInput = {
  caseReference: string;
  safeMessage: string;
  reportExtractionStatus: "not_configured" | "extracted_for_review" | "not_a_report" | "failed";
  reportExtractionMessage: string;
};

export function getCaseCreationFeedback(input: CaseCreationFeedbackInput) {
  if (input.reportExtractionStatus === "extracted_for_review") {
    return { title: `Case ${input.caseReference} created`, detail: "Report-supported findings are ready for clinician review.", tone: "success" as const };
  }
  if (input.reportExtractionStatus === "not_a_report") {
    return { title: `Case ${input.caseReference} created`, detail: "No readable radiology report was found in this upload. The study remains available for technical and image-model review.", tone: "info" as const };
  }
  if (input.reportExtractionStatus === "failed") {
    return { title: `Case ${input.caseReference} created`, detail: "Report extraction could not complete. No report findings were saved; review the source file or try again.", tone: "info" as const };
  }
  return { title: `Case ${input.caseReference} created`, detail: input.reportExtractionMessage || input.safeMessage, tone: "info" as const };
}
