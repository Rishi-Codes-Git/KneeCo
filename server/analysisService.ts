export type AnalysisServiceStatus = {
  configured: boolean;
  state: "not_configured" | "unreachable" | "awaiting_validation_scan" | "ready_for_validation" | "validated";
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
