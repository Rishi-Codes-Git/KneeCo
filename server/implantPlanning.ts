import { getImplantPlanByCaseReference, getKneeCaseByReference, getPresentationTestCaseByFileName, listImplantCatalogue, upsertImplantPlan } from "./db";

export type ImplantDimensions = {
  femoralApMm: number;
  femoralWidthMm: number;
  tibialApMm: number;
  tibialWidthMm: number;
};

export type RankedImplantReference = {
  rank: number;
  femoralSize: string;
  tibialSize: string;
  dimensionalProximityScore: number;
  normalizedRmsError: number;
  referenceDimensions: ImplantDimensions;
  dimensionDeltasMm: ImplantDimensions;
};

export type ImplantPlanningResult = {
  eligible: boolean;
  reason: string | null;
  dimensions: ImplantDimensions | null;
  rankings: RankedImplantReference[];
  summary: string | null;
  planningStatus: "ready_for_review" | "confirmed" | "closed" | null;
};

function parseDimensions(raw: string | null): ImplantDimensions | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ImplantDimensions>;
    const values = [parsed.femoralApMm, parsed.femoralWidthMm, parsed.tibialApMm, parsed.tibialWidthMm];
    if (!values.every((value) => typeof value === "number" && value > 0)) return null;
    return parsed as ImplantDimensions;
  } catch {
    return null;
  }
}

function rankCatalogue(dimensions: ImplantDimensions, catalogue: Awaited<ReturnType<typeof listImplantCatalogue>>): RankedImplantReference[] {
  return catalogue.map((row) => {
    const terms = [
      (row.femoralApMm - dimensions.femoralApMm) / dimensions.femoralApMm,
      (row.femoralWidthMm - dimensions.femoralWidthMm) / dimensions.femoralWidthMm,
      (row.tibialApMm - dimensions.tibialApMm) / dimensions.tibialApMm,
      (row.tibialWidthMm - dimensions.tibialWidthMm) / dimensions.tibialWidthMm,
    ];
    const normalizedRmsError = Math.sqrt(terms.reduce((sum, term) => sum + term * term, 0) / terms.length);
    const referenceDimensions = {
      femoralApMm: row.femoralApMm,
      femoralWidthMm: row.femoralWidthMm,
      tibialApMm: row.tibialApMm,
      tibialWidthMm: row.tibialWidthMm,
    };
    return {
      rank: 0,
      femoralSize: row.suggestedFemoralSize,
      tibialSize: row.suggestedTibialSize,
      dimensionalProximityScore: Math.max(0, Math.round((1 - normalizedRmsError) * 1000) / 10),
      normalizedRmsError: Math.round(normalizedRmsError * 10_000) / 10_000,
      referenceDimensions,
      dimensionDeltasMm: {
        femoralApMm: Math.round((referenceDimensions.femoralApMm - dimensions.femoralApMm) * 10) / 10,
        femoralWidthMm: Math.round((referenceDimensions.femoralWidthMm - dimensions.femoralWidthMm) * 10) / 10,
        tibialApMm: Math.round((referenceDimensions.tibialApMm - dimensions.tibialApMm) * 10) / 10,
        tibialWidthMm: Math.round((referenceDimensions.tibialWidthMm - dimensions.tibialWidthMm) * 10) / 10,
      },
    };
  }).sort((left, right) => left.normalizedRmsError - right.normalizedRmsError).slice(0, 3).map((candidate, index) => ({ ...candidate, rank: index + 1 }));
}

async function requestAnonymousPlanningSummary(dimensions: ImplantDimensions, rankings: RankedImplantReference[], fetchImpl: typeof fetch = fetch) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return `The closest catalogue reference pair is femoral ${rankings[0]?.femoralSize ?? "—"} and tibial ${rankings[0]?.tibialSize ?? "—"}; confirm all four dimensions before any clinical decision.`;
  const payload = {
    dimensions,
    ranked_reference_pairs: rankings.map(({ rank, femoralSize, tibialSize, dimensionalProximityScore }) => ({ rank, femoralSize, tibialSize, dimensionalProximityScore })),
  };
  try {
    const response = await fetchImpl("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent", {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Summarize the anonymous four-dimension reference ranking below in two concise sentences. Do not name a patient, diagnose, recommend surgery, or treat reference sizes as an implant order. State that clinician confirmation of dimensions is required. Data: ${JSON.stringify(payload)}` }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 180 },
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error("Summary request failed");
    const result = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = result.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
    return text || `The closest catalogue reference pair is femoral ${rankings[0]?.femoralSize ?? "—"} and tibial ${rankings[0]?.tibialSize ?? "—"}; confirm all four dimensions before any clinical decision.`;
  } catch {
    return `The closest catalogue reference pair is femoral ${rankings[0]?.femoralSize ?? "—"} and tibial ${rankings[0]?.tibialSize ?? "—"}; confirm all four dimensions before any clinical decision.`;
  }
}

export async function getImplantPlanningResult(caseReference: string): Promise<ImplantPlanningResult> {
  const kneeCase = await getKneeCaseByReference(caseReference);
  if (!kneeCase) return { eligible: false, reason: "Case not found.", dimensions: null, rankings: [], summary: null, planningStatus: null };
  const presentation = await getPresentationTestCaseByFileName(kneeCase.scanFileName);
  const dimensions = parseDimensions(presentation?.syntheticDimensionsJson ?? null);
  if (presentation?.syntheticOaStatus !== "present" || !dimensions) {
    return { eligible: false, reason: "Implant analysis is available after OA-positive assessment and four verified planning dimensions are available.", dimensions: null, rankings: [], summary: null, planningStatus: null };
  }
  const plan = await getImplantPlanByCaseReference(caseReference);
  if (!plan) return { eligible: true, reason: null, dimensions, rankings: [], summary: null, planningStatus: "ready_for_review" };
  return {
    eligible: true,
    reason: null,
    dimensions,
    rankings: JSON.parse(plan.rankingJson) as RankedImplantReference[],
    summary: plan.anonymousSummary,
    planningStatus: plan.planningStatus,
  };
}

export async function createImplantRanking(caseReference: string): Promise<ImplantPlanningResult> {
  const result = await getImplantPlanningResult(caseReference);
  if (!result.eligible || !result.dimensions) return result;
  const rankings = rankCatalogue(result.dimensions, await listImplantCatalogue());
  const summary = await requestAnonymousPlanningSummary(result.dimensions, rankings);
  await upsertImplantPlan({ caseReference, dimensionJson: JSON.stringify(result.dimensions), rankingJson: JSON.stringify(rankings), anonymousSummary: summary, planningStatus: "ready_for_review", confirmedAt: null, closedAt: null });
  return { ...result, rankings, summary, planningStatus: "ready_for_review" };
}
