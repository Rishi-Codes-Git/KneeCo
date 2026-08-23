import { z } from "zod";

export type GeminiReportInput = {
  caseId: string;
  fileName: string;
  contentType: string;
  contentBase64: string;
};

export type GeminiReportExtractionResult = {
  completed: boolean;
  status: "not_configured" | "extracted_for_review" | "not_a_report" | "failed";
  model: string | null;
  extraction: GeminiReportExtraction | null;
  safeMessage: string;
};

export type GeminiReportExtraction = {
  documentType: "radiology_report" | "not_a_radiology_report" | "unreadable";
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
};

const reportExtractionSchema = z.object({
  documentType: z.enum(["radiology_report", "not_a_radiology_report", "unreadable"]),
  summary: z.string().max(1200).nullable(),
  oaMention: z.enum(["reported", "not_reported", "unclear"]),
  oaSeverity: z.string().max(120).nullable(),
  femurFinding: z.string().max(500).nullable(),
  tibiaFinding: z.string().max(500).nullable(),
  medialMeniscusFinding: z.string().max(500).nullable(),
  femoralWidthMm: z.number().nonnegative().max(200).nullable(),
  femoralApMm: z.number().nonnegative().max(200).nullable(),
  tibialWidthMm: z.number().nonnegative().max(200).nullable(),
  tibialApMm: z.number().nonnegative().max(200).nullable(),
  medialMeniscusAnteriorMm: z.number().nonnegative().max(50).nullable(),
  medialMeniscusBodyMm: z.number().nonnegative().max(50).nullable(),
  medialMeniscusPosteriorMm: z.number().nonnegative().max(50).nullable(),
  citedReportPhrases: z.array(z.string().max(320)).max(12),
  reviewNote: z.string().max(600),
});

const REPORT_SCHEMA = {
  type: "object",
  properties: {
    documentType: { type: "string", enum: ["radiology_report", "not_a_radiology_report", "unreadable"] },
    summary: { type: ["string", "null"] },
    oaMention: { type: "string", enum: ["reported", "not_reported", "unclear"] },
    oaSeverity: { type: ["string", "null"] },
    femurFinding: { type: ["string", "null"] },
    tibiaFinding: { type: ["string", "null"] },
    medialMeniscusFinding: { type: ["string", "null"] },
    femoralWidthMm: { type: ["number", "null"] },
    femoralApMm: { type: ["number", "null"] },
    tibialWidthMm: { type: ["number", "null"] },
    tibialApMm: { type: ["number", "null"] },
    medialMeniscusAnteriorMm: { type: ["number", "null"] },
    medialMeniscusBodyMm: { type: ["number", "null"] },
    medialMeniscusPosteriorMm: { type: ["number", "null"] },
    citedReportPhrases: { type: "array", items: { type: "string" } },
    reviewNote: { type: "string" },
  },
  required: [
    "documentType", "summary", "oaMention", "oaSeverity", "femurFinding", "tibiaFinding", "medialMeniscusFinding",
    "femoralWidthMm", "femoralApMm", "tibialWidthMm", "tibialApMm", "medialMeniscusAnteriorMm", "medialMeniscusBodyMm", "medialMeniscusPosteriorMm", "citedReportPhrases", "reviewNote",
  ],
} as const;

const REPORT_PROMPT = `You are an extraction assistant for a clinician-facing knee review workflow. Read the supplied file only as a possible knee radiology report. Extract only information explicitly written in the report or clearly visible as report text. Do not diagnose, infer anatomy from an MRI image, estimate measurements, create segmentation masks, or recommend surgery or implants. If the file is an MRI image rather than a readable radiology report, return documentType "not_a_radiology_report" and set all findings and measurements to null. Return numeric values only when an explicit value in millimetres is stated in the report. Use null when a field is absent. citedReportPhrases must contain short source phrases copied or tightly quoted from the report. reviewNote must state that a clinician must verify the extracted information.`;

const geminiCandidates = ["gemini-3.6-flash", "gemini-3.5-flash"];

function extractText(response: unknown) {
  const payload = response as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  return payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
}

export async function extractGeminiMriReport(input: GeminiReportInput, fetchImpl: typeof fetch = fetch): Promise<GeminiReportExtractionResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { completed: false, status: "not_configured", model: null, extraction: null, safeMessage: "Gemini report extraction is not configured. No report findings were created." };
  }

  for (const model of geminiCandidates) {
    try {
      const response = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ inlineData: { mimeType: input.contentType, data: input.contentBase64 } }, { text: REPORT_PROMPT }] }],
          generationConfig: { responseMimeType: "application/json", responseJsonSchema: REPORT_SCHEMA, temperature: 0 },
        }),
        signal: AbortSignal.timeout(60_000),
      });
      if (response.status === 404) continue;
      if (!response.ok) throw new Error(`Gemini extraction request failed with ${response.status}`);
      const extraction = reportExtractionSchema.parse(JSON.parse(extractText(await response.json())));
      if (extraction.documentType !== "radiology_report") {
        return { completed: false, status: "not_a_report", model, extraction, safeMessage: "The uploaded file was not recognised as a readable knee radiology report. No report findings or measurements were inferred." };
      }
      return { completed: true, status: "extracted_for_review", model, extraction, safeMessage: "Report-supported findings were extracted for clinician review. Values not explicitly stated in the report remain blank." };
    } catch {
      return { completed: false, status: "failed", model, extraction: null, safeMessage: "Gemini could not extract this MRI report. The case was stored without report-derived findings; please review the source report and try again." };
    }
  }
  return { completed: false, status: "failed", model: null, extraction: null, safeMessage: "No configured Gemini model was available for report extraction. The case was stored without report-derived findings." };
}
