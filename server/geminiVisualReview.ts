import { z } from "zod";

export type GeminiVisualReviewInput = {
  caseId: string;
  fileName: string;
  contentType: string;
  contentBase64: string;
};

export type GeminiVisualReview = {
  studyType: "knee_mri_image" | "not_knee_mri_or_unreadable";
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
  reviewNote: string;
};

export type GeminiVisualReviewResult = {
  completed: boolean;
  status: "not_configured" | "not_an_image" | "visible_for_review" | "not_knee_mri_or_unreadable" | "failed";
  model: string | null;
  review: GeminiVisualReview | null;
  safeMessage: string;
};

const structureSchema = z.object({
  visibility: z.enum(["visible", "partly_visible", "not_assessable"]),
  visualDescriptor: z.string().max(500).nullable(),
});

const visualReviewSchema = z.object({
  studyType: z.enum(["knee_mri_image", "not_knee_mri_or_unreadable"]),
  imageQuality: z.enum(["sufficient_for_visual_review", "limited", "not_assessable"]),
  femur: structureSchema,
  tibia: structureSchema,
  medialMeniscus: structureSchema,
  roughEstimates: z.object({
    scaleDetected: z.boolean(), femoralWidthMm: z.number().positive().max(200).nullable(), femoralApMm: z.number().positive().max(200).nullable(),
    tibialWidthMm: z.number().positive().max(200).nullable(), tibialApMm: z.number().positive().max(200).nullable(),
    medialMeniscusAnteriorMm: z.number().positive().max(50).nullable(), medialMeniscusBodyMm: z.number().positive().max(50).nullable(), medialMeniscusPosteriorMm: z.number().positive().max(50).nullable(),
  }),
  oaVisualAssessment: z.object({ status: z.enum(["features_not_apparent", "features_possible", "features_present", "not_assessable"]), descriptor: z.string().max(600) }),
  implantPlanning: z.object({ status: z.enum(["not_triggered", "candidate_sizing_preview"]), candidateSizeBand: z.enum(["small", "medium", "large", "not_available"]), rationale: z.string().max(500) }),
  reviewNote: z.string().max(600),
});

const VISUAL_REVIEW_SCHEMA = {
  type: "object",
  properties: {
    studyType: { type: "string", enum: ["knee_mri_image", "not_knee_mri_or_unreadable"] },
    imageQuality: { type: "string", enum: ["sufficient_for_visual_review", "limited", "not_assessable"] },
    femur: { type: "object", properties: { visibility: { type: "string", enum: ["visible", "partly_visible", "not_assessable"] }, visualDescriptor: { type: ["string", "null"] } }, required: ["visibility", "visualDescriptor"] },
    tibia: { type: "object", properties: { visibility: { type: "string", enum: ["visible", "partly_visible", "not_assessable"] }, visualDescriptor: { type: ["string", "null"] } }, required: ["visibility", "visualDescriptor"] },
    medialMeniscus: { type: "object", properties: { visibility: { type: "string", enum: ["visible", "partly_visible", "not_assessable"] }, visualDescriptor: { type: ["string", "null"] } }, required: ["visibility", "visualDescriptor"] },
    roughEstimates: { type: "object", properties: { scaleDetected: { type: "boolean" }, femoralWidthMm: { type: ["number", "null"] }, femoralApMm: { type: ["number", "null"] }, tibialWidthMm: { type: ["number", "null"] }, tibialApMm: { type: ["number", "null"] }, medialMeniscusAnteriorMm: { type: ["number", "null"] }, medialMeniscusBodyMm: { type: ["number", "null"] }, medialMeniscusPosteriorMm: { type: ["number", "null"] } }, required: ["scaleDetected", "femoralWidthMm", "femoralApMm", "tibialWidthMm", "tibialApMm", "medialMeniscusAnteriorMm", "medialMeniscusBodyMm", "medialMeniscusPosteriorMm"] },
    oaVisualAssessment: { type: "object", properties: { status: { type: "string", enum: ["features_not_apparent", "features_possible", "features_present", "not_assessable"] }, descriptor: { type: "string" } }, required: ["status", "descriptor"] },
    implantPlanning: { type: "object", properties: { status: { type: "string", enum: ["not_triggered", "candidate_sizing_preview"] }, candidateSizeBand: { type: "string", enum: ["small", "medium", "large", "not_available"] }, rationale: { type: "string" } }, required: ["status", "candidateSizeBand", "rationale"] },
    reviewNote: { type: "string" },
  },
  required: ["studyType", "imageQuality", "femur", "tibia", "medialMeniscus", "roughEstimates", "oaVisualAssessment", "implantPlanning", "reviewNote"],
} as const;

const VISUAL_REVIEW_PROMPT = `You are reviewing one uploaded image for a rapid knee-MRI demonstration workflow. Determine whether it appears to be a readable knee MRI image and provide visual descriptors for the femur, tibia, and medial meniscus. If a physical scale marker is visibly present in the image, use it only to create rough visual estimates in millimetres. Set scaleDetected false and all roughEstimates to null if the scale is not clearly usable. These are rough image estimates, not calibrated measurements, segmentation masks, diagnosis, or surgical advice. Assess visible OA-like features only as features_not_apparent, features_possible, features_present, or not_assessable. Create implantPlanning as candidate_sizing_preview only when features_present; choose only a generic small, medium, or large size band, never a manufacturer, device, definitive size, or operative recommendation. If it is not a knee MRI image or is unreadable, return studyType "not_knee_mri_or_unreadable", all structure visibility not_assessable, all estimates null, OA status not_assessable, and implant planning not_triggered. reviewNote must state that rough values and planning support require clinician confirmation.`;
const geminiCandidates = ["gemini-3.6-flash", "gemini-3.5-flash"];

function extractText(response: unknown) {
  const payload = response as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  return payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
}

export async function reviewGeminiMriImage(input: GeminiVisualReviewInput, fetchImpl: typeof fetch = fetch): Promise<GeminiVisualReviewResult> {
  if (!input.contentType.startsWith("image/")) {
    return { completed: false, status: "not_an_image", model: null, review: null, safeMessage: "Gemini visual review applies to uploaded image studies. This PDF can still be processed as a readable radiology report." };
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { completed: false, status: "not_configured", model: null, review: null, safeMessage: "Gemini visual review is not configured. No visual anatomy descriptors were created." };
  }
  for (const model of geminiCandidates) {
    try {
      const response = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ inlineData: { mimeType: input.contentType, data: input.contentBase64 } }, { text: VISUAL_REVIEW_PROMPT }] }],
          generationConfig: { responseMimeType: "application/json", responseJsonSchema: VISUAL_REVIEW_SCHEMA, temperature: 0 },
        }),
        signal: AbortSignal.timeout(60_000),
      });
      if (response.status === 404) continue;
      if (!response.ok) throw new Error(`Gemini visual review failed with ${response.status}`);
      const review = visualReviewSchema.parse(JSON.parse(extractText(await response.json())));
      if (review.studyType !== "knee_mri_image") {
        return { completed: false, status: "not_knee_mri_or_unreadable", model, review, safeMessage: "The uploaded image was not confirmed as a readable knee MRI. No visual anatomy descriptors were created." };
      }
      return { completed: true, status: "visible_for_review", model, review, safeMessage: "Visual anatomy descriptors and any available rough scale-based estimates are ready for clinician confirmation. No segmentation mask or calibrated measurement was produced." };
    } catch {
      return { completed: false, status: "failed", model, review: null, safeMessage: "Gemini visual review could not complete. No visual anatomy descriptors were saved." };
    }
  }
  return { completed: false, status: "failed", model: null, review: null, safeMessage: "No configured Gemini model was available for visual image review." };
}
