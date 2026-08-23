import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getAnalysisServiceStatus, requestOaClassification, requestStudyPreflight } from "./analysisService";
import { buildCaseAnalysisPersistence } from "./caseAnalysis";
import { extractGeminiMriReport } from "./geminiReport";
import { reviewGeminiMriImage } from "./geminiVisualReview";
import { createKneeCase, deleteKneeCaseByReference, getKneeCaseByReference, listKneeCases, updateCaseLifecycle, updateImplantPlanStatus, updateKneeCaseReportStatus, upsertClinicianProfile } from "./db";
import { createImplantRanking, getImplantPlanningResult } from "./implantPlanning";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { storagePut } from "./storage";

const maxScanBytes = 20 * 1024 * 1024;
const scanInput = z.object({
  fileName: z.string().trim().min(5).max(255).refine((value) => /\.(jpg|jpeg|png|pdf)$/i.test(value), "Upload a JPG, JPEG, PNG, or PDF knee study."),
  contentType: z.string().max(120).optional(),
  sizeBytes: z.number().int().positive().max(maxScanBytes),
  contentBase64: z.string().min(1).max(28_000_000),
});

const newCaseInput = z.object({
  patientId: z.string().trim().min(2).max(80),
  patientName: z.string().trim().min(2).max(160),
  age: z.number().int().min(1).max(120),
  sex: z.enum(["female", "male", "intersex", "not_recorded"]),
  oaStatus: z.enum(["yes", "no", "unknown"]),
  lifestyleContext: z.string().trim().max(500).optional(),
  kneeSide: z.enum(["left", "right", "bilateral", "unknown"]),
  scan: scanInput,
});

function makeCaseReference() {
  return `KC-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
}

function safeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  branding: router({
    publicConfig: publicProcedure.query(() => ({
      title: process.env.VITE_APP_TITLE ?? "",
      logo: process.env.VITE_APP_LOGO ?? "",
      tagline: "Doctor's Knee Companion",
      accentColor: "#C97C8D",
      poweredBy: "Elro Tech",
    })),
  }),
  analysis: router({
    serviceStatus: publicProcedure.query(() => getAnalysisServiceStatus()),
  }),
  implant: router({
    get: publicProcedure.input(z.object({ caseReference: z.string().trim().min(1).max(40) })).query(({ input }) => getImplantPlanningResult(input.caseReference)),
    rank: publicProcedure.input(z.object({ caseReference: z.string().trim().min(1).max(40) })).mutation(({ input }) => createImplantRanking(input.caseReference)),
    confirm: publicProcedure.input(z.object({ caseReference: z.string().trim().min(1).max(40) })).mutation(async ({ input }) => {
      const plan = await getImplantPlanningResult(input.caseReference);
      if (!plan.eligible || !plan.rankings.length) throw new Error("Create and review implant candidates before confirming this case.");
      await updateCaseLifecycle(input.caseReference, "confirmed");
      await updateImplantPlanStatus(input.caseReference, "confirmed");
      return { confirmed: true } as const;
    }),
    close: publicProcedure.input(z.object({ caseReference: z.string().trim().min(1).max(40) })).mutation(async ({ input }) => {
      const plan = await getImplantPlanningResult(input.caseReference);
      if (!plan.eligible || !plan.rankings.length) throw new Error("Create and review implant candidates before closing this case.");
      await updateCaseLifecycle(input.caseReference, "closed");
      await updateImplantPlanStatus(input.caseReference, "closed");
      return { closed: true } as const;
    }),
  }),
  profile: router({
    completeSignup: protectedProcedure.input(z.object({
      fullName: z.string().trim().min(2).max(160),
      clinicName: z.string().trim().min(2).max(200),
      professionalEmail: z.string().trim().email().max(320),
    })).mutation(async ({ ctx, input }) => {
      await upsertClinicianProfile({
        userId: ctx.user.id,
        fullName: input.fullName,
        clinicName: input.clinicName,
        professionalEmail: input.professionalEmail.toLowerCase(),
      });
      return { success: true } as const;
    }),
  }),
  cases: router({
    list: publicProcedure.query(() => listKneeCases()),
    get: publicProcedure.input(z.object({ caseReference: z.string().trim().min(1).max(40) })).query(({ input }) => getKneeCaseByReference(input.caseReference)),
    delete: publicProcedure.input(z.object({ caseReference: z.string().trim().min(1).max(40) })).mutation(async ({ input }) => {
      const deleted = await deleteKneeCaseByReference(input.caseReference);
      return { deleted } as const;
    }),
    setReportStatus: publicProcedure.input(z.object({
      caseReference: z.string().trim().min(1).max(40),
      status: z.enum(["pending_validation", "queued", "processing", "ready_for_review", "review_required", "failed"]),
    })).mutation(async ({ input }) => {
      const updated = await updateKneeCaseReportStatus(input.caseReference, input.status);
      return { updated, status: input.status } as const;
    }),
    create: publicProcedure.input(newCaseInput).mutation(async ({ input }) => {
      const fileBuffer = Buffer.from(input.scan.contentBase64, "base64");
      if (!fileBuffer.length || fileBuffer.length > maxScanBytes) {
        throw new Error("The image or PDF study is empty or exceeds the 20 MB intake limit.");
      }

      const caseReference = makeCaseReference();
      const storedScan = await storagePut(
        `cases/${caseReference}/${safeFileName(input.scan.fileName)}`,
        fileBuffer,
        input.scan.contentType || "application/octet-stream",
      );

      const preflight = await requestStudyPreflight({
        caseId: caseReference,
        fileName: input.scan.fileName,
        contentType: input.scan.contentType || "application/octet-stream",
        contentBase64: input.scan.contentBase64,
      });
      const oaClassification = await requestOaClassification({
        caseId: caseReference,
        fileName: input.scan.fileName,
        contentType: input.scan.contentType || "application/octet-stream",
        contentBase64: input.scan.contentBase64,
      });
      const analysisPersistence = buildCaseAnalysisPersistence(preflight, oaClassification);
      const geminiReport = await extractGeminiMriReport({
        caseId: caseReference,
        fileName: input.scan.fileName,
        contentType: input.scan.contentType || "application/octet-stream",
        contentBase64: input.scan.contentBase64,
      });
      const geminiVisualReview = await reviewGeminiMriImage({
        caseId: caseReference,
        fileName: input.scan.fileName,
        contentType: input.scan.contentType || "application/octet-stream",
        contentBase64: input.scan.contentBase64,
      });

      await createKneeCase({
        caseReference,
        patientId: input.patientId,
        patientName: input.patientName,
        age: input.age,
        sex: input.sex,
        oaStatus: input.oaStatus,
        lifestyleContext: input.lifestyleContext || null,
        kneeSide: input.kneeSide,
        scanFileKey: storedScan.key,
        scanFileName: input.scan.fileName,
        scanMimeType: input.scan.contentType || "application/octet-stream",
        scanSizeBytes: input.scan.sizeBytes,
        analysisStatus: analysisPersistence.analysisStatus,
        oaModelName: analysisPersistence.oaModelName,
        oaModelVersion: analysisPersistence.oaModelVersion,
        oaClassificationJson: analysisPersistence.oaClassificationJson,
        oaClassifiedAt: analysisPersistence.oaClassifiedAt,
        geminiReportModel: geminiReport.completed ? geminiReport.model : null,
        geminiReportJson: geminiReport.completed && geminiReport.extraction ? JSON.stringify(geminiReport.extraction) : null,
        geminiReportExtractedAt: geminiReport.completed ? new Date() : null,
        geminiReportStatus: geminiReport.status,
        geminiReportMessage: geminiReport.safeMessage,
        geminiVisualModel: geminiVisualReview.completed ? geminiVisualReview.model : null,
        geminiVisualJson: geminiVisualReview.completed && geminiVisualReview.review ? JSON.stringify(geminiVisualReview.review) : null,
        geminiVisualStatus: geminiVisualReview.status,
        geminiVisualMessage: geminiVisualReview.safeMessage,
      });

      return {
        caseReference,
        analysisStatus: analysisPersistence.analysisStatus,
        preflightCompleted: preflight.completed,
        oaClassificationCompleted: oaClassification.completed,
        reportExtractionCompleted: geminiReport.completed,
        reportExtractionStatus: geminiReport.status,
        reportExtractionMessage: geminiReport.safeMessage,
        visualReviewCompleted: geminiVisualReview.completed,
        visualReviewStatus: geminiVisualReview.status,
        visualReviewMessage: geminiVisualReview.safeMessage,
        safeMessage: geminiReport.completed ? geminiReport.safeMessage : `${analysisPersistence.safeMessage} ${geminiReport.safeMessage}`,
      } as const;
    }),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
