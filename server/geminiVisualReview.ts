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
    reviewNote: { type: "string" },
  },
  required: ["studyType", "imageQuality", "femur", "tibia", "medialMeniscus", "reviewNote"],
} as const;

const VISUAL_REVIEW_PROMPT = `You are reviewing one uploaded image for a clinician-facing knee workflow. Determine only whether it appears to be a readable knee MRI image and provide cautious visual descriptors for the femur, tibia, and medial meniscus. This is not a diagnostic, segmentation, or measurement task. Never output millimetres, pixel lengths, thickness values, implant sizes, a diagnosis, or a surgical recommendation. Do not claim a structure is visible unless it can be visually identified in this single image. If it is not a knee MRI image or is unreadable, return studyType "not_knee_mri_or_unreadable" and make every structure not_assessable with null descriptor. reviewNote must say this is a non-calibrated visual estimate requiring clinician review.`;
const geminiCandidates = ["gemini-2.5-flash", "gemini-3.7-flash"];

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
      return { completed: true, status: "visible_for_review", model, review, safeMessage: "Non-calibrated visual anatomy descriptors are available for clinician review. No millimetre measurement or segmentation was produced." };
    } catch {
      return { completed: false, status: "failed", model, review: null, safeMessage: "Gemini visual review could not complete. No visual anatomy descriptors were saved." };
    }
  }
  return { completed: false, status: "failed", model: null, review: null, safeMessage: "No configured Gemini model was available for visual image review." };
}
