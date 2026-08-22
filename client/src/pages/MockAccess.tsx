import { KneeCoMark } from "@/components/KneeCoMark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { defaultClinicianSession, startClinicianSession } from "@/lib/clinicianSession";
import { ArrowUpRight, FileCheck2, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { useLocation } from "wouter";

type AccessMode = "signin" | "signup";

export default function MockAccess() {
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<AccessMode>("signin");
  const isSignUp = mode === "signup";

  const enterWorkspace = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startClinicianSession(sessionStorage, {
      name: String(data.get("fullName") ?? defaultClinicianSession.name),
      clinicName: String(data.get("clinicName") ?? defaultClinicianSession.clinicName),
      email: String(data.get("email") ?? defaultClinicianSession.email),
    });
    setLocation("/home");
  };

  return (
    <main className="auth-mesh flex min-h-screen items-center justify-center p-4 sm:p-6">
      <section className="w-full max-w-[540px] rounded-[2rem] border border-[#EADDE0] bg-white p-7 shadow-[0_24px_70px_-38px_rgba(92,49,61,0.36)] sm:p-10">
        <div className="flex justify-center"><KneeCoMark /></div>
        <div className="mt-9 flex rounded-2xl bg-[#FBF3F4] p-1.5">
          <button type="button" onClick={() => setMode("signin")} aria-pressed={mode === "signin"} className={`flex-1 rounded-xl px-4 py-3 text-sm font-extrabold transition-all ${mode === "signin" ? "bg-white text-[#352C30] shadow-sm" : "text-[#987780] hover:text-[#5F4B51]"}`}>Sign in</button>
          <button type="button" onClick={() => setMode("signup")} aria-pressed={mode === "signup"} className={`flex-1 rounded-xl px-4 py-3 text-sm font-extrabold transition-all ${mode === "signup" ? "bg-white text-[#352C30] shadow-sm" : "text-[#987780] hover:text-[#5F4B51]"}`}>Create account</button>
        </div>
        <div className="mt-8 text-center">
          <p className="text-xs font-extrabold uppercase tracking-[0.17em] text-[#A6556A]">{isSignUp ? "Clinician registration" : "Secure clinician access"}</p>
          <h1 className="font-kneeco-display mt-3 text-4xl tracking-[-0.035em] text-[#352C30]">{isSignUp ? "Set up your KneeCo account." : "Welcome back to KneeCo."}</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#78676D]">{isSignUp ? "Your professional profile connects case history, review preferences, and clinical reports." : "Continue to your private KneeCo workspace and active case archive."}</p>
        </div>

        <form onSubmit={enterWorkspace} className="mt-8 space-y-5">
          {isSignUp && <div className="grid gap-5 sm:grid-cols-2"><label className="space-y-2 text-sm font-bold text-[#514147]">Full name<Input name="fullName" required defaultValue={defaultClinicianSession.name} className="h-12 border-[#E9DDE0] bg-white focus-visible:ring-[#C97C8D]" /></label><label className="space-y-2 text-sm font-bold text-[#514147]">Clinic name<Input name="clinicName" required defaultValue={defaultClinicianSession.clinicName} className="h-12 border-[#E9DDE0] bg-white focus-visible:ring-[#C97C8D]" /></label></div>}
          <label className="block space-y-2 text-sm font-bold text-[#514147]">Professional email<Input name="email" required type="email" defaultValue={defaultClinicianSession.email} className="h-12 border-[#E9DDE0] bg-white focus-visible:ring-[#C97C8D]" /></label>
          {!isSignUp && <label className="block space-y-2 text-sm font-bold text-[#514147]">Password<Input name="password" required type="password" defaultValue="KneeCo2026" className="h-12 border-[#E9DDE0] bg-white focus-visible:ring-[#C97C8D]" /></label>}
          {isSignUp && <div className="rounded-xl border border-[#F0E5E7] bg-[#FFFAFB] p-3.5 text-xs leading-5 text-[#79666D]"><span className="flex gap-2"><FileCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-[#A6556A]" />Professional licence verification can be completed later from your profile.</span></div>}
          <Button type="submit" className="group h-13 w-full rounded-xl bg-[#C97C8D] text-sm font-extrabold text-white shadow-[0_14px_26px_-14px_rgba(166,85,106,0.8)] transition hover:bg-[#A6556A] active:scale-[0.98]">{isSignUp ? "Create account" : "Sign in"}<ArrowUpRight className="ml-2 h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></Button>
        </form>
        <p className="mt-7 flex justify-center gap-2 text-center text-xs leading-5 text-[#8D787F]"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#A6556A]" />Decision support only—not a final diagnosis.</p>
        <p className="mt-10 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-[#A28E94]">Powered by Elro Tech</p>
      </section>
    </main>
  );
}
