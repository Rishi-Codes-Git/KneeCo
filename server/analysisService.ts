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

export type OaClassificationResult = {
  completed: boolean;
  analysisStatus: "pending_validation" | "ready_for_review";
  modelName: string | null;
  modelVersion: string | null;
  classification: {
    stageLabel: "Normal" | "MildOA" | "ModerateOA" | "SevereOA";
    stageProbabilities: Record<string, number>;
    topClassProbability: number;
  } | null;
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

export async function requestOaClassification(input: StudyPreflightInput, fetchImpl: typeof fetch = fetch): Promise<OaClassificationResult> {
  const baseUrl = process.env.AI_SERVICE_URL;
  if (!baseUrl) {
    return {
      completed: false,
      analysisStatus: "pending_validation",
      modelName: null,
      modelVersion: null,
      classification: null,
      safeMessage: "The FastAPI OA classifier is not configured. No OA classifier result was generated.",
    };
  }

  try {
    const response = await fetchImpl(`${baseUrl.replace(/\/$/, "")}/v1/studies/classify-oa`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        case_id: input.caseId,
        file_name: input.fileName,
        content_type: input.contentType,
        content_base64: input.contentBase64,
      }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) throw new Error("OA classification request failed");
    const payload = (await response.json()) as {
      status?: string;
      model_id?: string;
      model_version?: string;
      stage_label?: string;
      stage_probabilities?: Record<string, number>;
      top_class_probability?: number;
      safe_message?: string;
    };
    const hasReviewResult = payload.status === "model_result_for_review" && Boolean(payload.stage_label && payload.stage_probabilities && payload.top_class_probability !== undefined);
    return {
      completed: hasReviewResult,
      analysisStatus: hasReviewResult ? "ready_for_review" : "pending_validation",
      modelName: payload.model_id ?? null,
      modelVersion: payload.model_version ?? null,
      classification: hasReviewResult ? {
        stageLabel: payload.stage_label as "Normal" | "MildOA" | "ModerateOA" | "SevereOA",
        stageProbabilities: payload.stage_probabilities ?? {},
        topClassProbability: payload.top_class_probability ?? 0,
      } : null,
      safeMessage: payload.safe_message ?? "No OA classifier result was generated.",
    };
  } catch {
    return {
      completed: false,
      analysisStatus: "pending_validation",
      modelName: null,
      modelVersion: null,
      classification: null,
      safeMessage: "The FastAPI OA classifier could not be reached. No OA classifier result was created.",
    };
  }
}
