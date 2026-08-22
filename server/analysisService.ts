export type AnalysisServiceStatus = {
  configured: boolean;
  state: "not_configured" | "unreachable" | "awaiting_validation_scan" | "ready_for_validation" | "validated";
  safeMessage: string;
};

export type StudyPreflightInput = {
  caseId: string;
  fileName: string;
  contentType: string;
  contentBase64: string;
};

export type StudyPreflightResult = {
  configured: boolean;
  completed: boolean;
  analysisStatus: "pending_validation" | "review_required";
  safeMessage: string;
};

type HealthPayload = {
  state?: AnalysisServiceStatus["state"];
  safe_message?: string;
};

export async function getAnalysisServiceStatus(fetchImpl: typeof fetch = fetch): Promise<AnalysisServiceStatus> {
  const baseUrl = process.env.AI_SERVICE_URL;
  if (!baseUrl) {
    return {
      configured: false,
      state: "not_configured",
      safeMessage: "Analysis service is not configured. Automatic MRI inference remains unavailable until validation setup is complete.",
    };
  }

  try {
    const response = await fetchImpl(`${baseUrl.replace(/\/$/, "")}/health`, { signal: AbortSignal.timeout(2500) });
    if (!response.ok) throw new Error("Unhealthy analysis service");
    const payload = (await response.json()) as HealthPayload;
    return {
      configured: true,
      state: payload.state ?? "unreachable",
      safeMessage: payload.safe_message ?? "Analysis-service status could not be verified.",
    };
  } catch {
    return {
      configured: true,
      state: "unreachable",
      safeMessage: "Analysis service could not be reached. No MRI inference result will be created.",
    };
  }
}

export async function requestStudyPreflight(input: StudyPreflightInput, fetchImpl: typeof fetch = fetch): Promise<StudyPreflightResult> {
  const baseUrl = process.env.AI_SERVICE_URL;
  if (!baseUrl) {
    return {
      configured: false,
      completed: false,
      analysisStatus: "pending_validation",
      safeMessage: "The FastAPI analysis service is not configured. The study is stored for later technical preflight and clinician review.",
    };
  }

  try {
    const response = await fetchImpl(`${baseUrl.replace(/\/$/, "")}/v1/studies/preflight`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        case_id: input.caseId,
        file_name: input.fileName,
        content_type: input.contentType,
        content_base64: input.contentBase64,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error("Study preflight request failed");
    const payload = (await response.json()) as { safe_message?: string };
    return {
      configured: true,
      completed: true,
      analysisStatus: "review_required",
      safeMessage: payload.safe_message ?? "Technical preflight completed. Clinician review remains required.",
    };
  } catch {
    return {
      configured: true,
      completed: false,
      analysisStatus: "pending_validation",
      safeMessage: "The FastAPI analysis service could not complete technical preflight. No anatomy or measurement result was created.",
    };
  }
}
