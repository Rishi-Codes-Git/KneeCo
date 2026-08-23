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
  void dimensions;
  void fetchImpl;
  const reference = rankings[0]?.referenceDimensions;
  if (!reference) return "No structured sizing reference could be prepared from the current catalogue.";
  return `Closest catalogue reference: femoral AP ${reference.femoralApMm.toFixed(1)} mm, femoral ML ${reference.femoralWidthMm.toFixed(1)} mm, tibial AP ${reference.tibialApMm.toFixed(1)} mm, and tibial ML ${reference.tibialWidthMm.toFixed(1)} mm. Confirm all four dimensions before any clinical decision.`;
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
