import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getAnalysisServiceStatus } from "./analysisService";
import { upsertClinicianProfile } from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";

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

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
