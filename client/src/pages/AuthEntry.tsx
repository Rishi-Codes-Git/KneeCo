import { useAuth } from "@/_core/hooks/useAuth";
import { KneeCoMark } from "@/components/KneeCoMark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { startLogin } from "@/const";
import { normaliseRegistrationDraft, RegistrationDraft } from "@/lib/authDraft";
import { trpc } from "@/lib/trpc";
import { ArrowUpRight, Check, FileCheck2, FileLock2, Loader2, LogOut, ShieldCheck, Sparkles } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";

type AuthMode = "signin" | "signup";
const DRAFT_KEY = "kneeco-registration-draft";

function saveDraft(form: HTMLFormElement) {
  const data = new FormData(form);
  const draft = normaliseRegistrationDraft({
    fullName: String(data.get("fullName") ?? ""),
    clinicName: String(data.get("clinicName") ?? ""),
    email: String(data.get("email") ?? ""),
    licenceFileName: null,
  });
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

function loadDraft(): RegistrationDraft | null {
  try {
    const value = sessionStorage.getItem(DRAFT_KEY);
    return value ? (JSON.parse(value) as RegistrationDraft) : null;
  } catch {
    return null;
  }
}

function AuthenticatedState() {
  const { user, logout } = useAuth();
  const profileMutation = trpc.profile.completeSignup.useMutation();
  const synced = useRef(false);
  const [profileMessage, setProfileMessage] = useState("Your secure workspace access is confirmed.");

  useEffect(() => {
    const draft = loadDraft();
    if (!draft || synced.current || profileMutation.isPending) return;
    synced.current = true;
    profileMutation.mutate(
      { fullName: draft.fullName, clinicName: draft.clinicName, professionalEmail: draft.email },
      {
        onSuccess: () => {
          sessionStorage.removeItem(DRAFT_KEY);
          setProfileMessage("Your clinician profile has been saved. Licence verification can be added later from your profile settings.");
        },
        onError: () => {
          setProfileMessage("Your account is secure, but we could not save the clinician profile yet. Please try again after returning to this screen.");
        },
      },
    );
  }, [profileMutation]);

  return (
    <main className="auth-mesh flex min-h-screen items-center justify-center p-4 sm:p-6">
      <section className="w-full max-w-[520px] rounded-[2rem] border border-[#EADDE0] bg-white p-8 text-center shadow-[0_24px_70px_-38px_rgba(92,49,61,0.36)] sm:p-12">
        <div className="mx-auto w-fit"><KneeCoMark /></div>
        <div className="mx-auto mt-10 flex h-14 w-14 items-center justify-center rounded-full bg-[#F9E8EB] text-[#A6556A]"><Check className="h-7 w-7" /></div>
        <p className="mt-7 text-xs font-extrabold uppercase tracking-[0.17em] text-[#A6556A]">Authorised access</p>
        <h1 className="font-kneeco-display mt-3 text-4xl tracking-[-0.035em] text-[#352C30]">Welcome, {user?.name?.split(" ")[0] ?? "clinician"}.</h1>
        <p className="mt-4 text-sm leading-6 text-[#78676D]">{profileMutation.isPending ? "Saving your clinician profile…" : profileMessage}</p>
        <div className="mt-8 rounded-xl border border-[#F0E5E7] bg-[#FFFAFB] p-4 text-left text-sm text-[#6F6267]"><span className="flex gap-2"><FileLock2 className="mt-0.5 h-4 w-4 shrink-0 text-[#A6556A]" />KneeCo remains decision support only—not a final diagnosis.</span></div>
        <Button type="button" variant="outline" onClick={() => void logout()} className="mt-8 h-11 rounded-xl border-[#E5D4D8] text-[#6E575E] hover:bg-[#FBF1F3]"><LogOut className="mr-2 h-4 w-4" />Sign out</Button>
        <p className="mt-9 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#A28E94]">Powered by Elro Tech</p>
      </section>
    </main>
  );
}

export default function AuthEntry() {
  const { isAuthenticated, loading } = useAuth();
  const [mode, setMode] = useState<AuthMode>("signin");

  if (loading) {
    return <main className="auth-mesh flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#A6556A]" /></main>;
  }

  if (isAuthenticated) return <AuthenticatedState />;

  const isSignUp = mode === "signup";
  const submitSignup = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    saveDraft(event.currentTarget);
    startLogin();
  };

  return (
    <main className="auth-mesh min-h-screen overflow-hidden p-4 sm:p-6 lg:p-8">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-[1440px] overflow-hidden rounded-[2rem] border border-[#EADDE0] bg-white shadow-[0_24px_70px_-38px_rgba(92,49,61,0.36)] lg:grid-cols-[1.06fr_0.94fr]">
        <section className="relative hidden min-h-full overflow-hidden bg-[#fffafa] p-12 lg:flex lg:flex-col xl:p-16">
          <div className="absolute -left-24 top-16 h-72 w-72 rounded-full bg-[#F3DCE1] blur-3xl" /><div className="absolute -bottom-28 right-2 h-80 w-80 rounded-full bg-[#EAC3CB] opacity-60 blur-3xl" />
          <div className="relative flex items-center justify-between"><KneeCoMark /><span className="rounded-full border border-[#EBCFD5] bg-white/80 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#9C6570]">Clinical workspace</span></div>
          <div className="relative my-auto max-w-lg py-16">
            <p className="mb-6 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-[#A6556A]"><Sparkles className="h-3.5 w-3.5" /> Measured. Reviewable. Yours.</p>
            <h1 className="font-kneeco-display text-5xl leading-[1.04] tracking-[-0.04em] text-[#352C30] xl:text-6xl">A calmer way to read the knee.</h1>
            <p className="mt-7 max-w-md text-base leading-7 text-[#6F6267]">KneeCo brings automatic first-pass MRI assessment and clinician approval into one considered clinical workspace.</p>
            <div className="mt-12 space-y-4">{[["Automatic first pass", "Femur, tibia and medial-meniscus analysis, ready for review."], ["Clinician remains in control", "Every measurement stays reviewable before it becomes a report."], ["Designed for continuity", "A secure workspace for cases, context and future learning."]].map(([title, description], index) => <div key={title} className="flex items-start gap-4 border-t border-[#EADDE0] pt-4"><span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#C97C8D] text-xs font-extrabold text-white">0{index + 1}</span><div><p className="text-sm font-extrabold text-[#403338]">{title}</p><p className="mt-1 text-sm leading-5 text-[#77686D]">{description}</p></div></div>)}</div>
          </div>
          <div className="relative flex items-center gap-2 text-xs font-semibold text-[#8A777D]"><span className="h-px w-8 bg-[#D7AFB8]" /> Powered by Elro Tech</div>
        </section>
        <section className="relative flex min-h-full items-center justify-center p-6 sm:p-10 lg:p-14">
          <div className="absolute right-8 top-8 lg:hidden"><KneeCoMark size="sm" /></div>
          <div className="w-full max-w-[430px] pt-16 lg:pt-0">
            <div className="mb-9 flex rounded-2xl bg-[#FBF3F4] p-1.5"><button type="button" onClick={() => setMode("signin")} aria-pressed={mode === "signin"} className={`flex-1 rounded-xl px-4 py-3 text-sm font-extrabold transition-all ${mode === "signin" ? "bg-white text-[#352C30] shadow-sm" : "text-[#987780] hover:text-[#5F4B51]"}`}>Sign in</button><button type="button" onClick={() => setMode("signup")} aria-pressed={mode === "signup"} className={`flex-1 rounded-xl px-4 py-3 text-sm font-extrabold transition-all ${mode === "signup" ? "bg-white text-[#352C30] shadow-sm" : "text-[#987780] hover:text-[#5F4B51]"}`}>Create account</button></div>
            <div className="mb-8"><p className="text-xs font-extrabold uppercase tracking-[0.17em] text-[#A6556A]">{isSignUp ? "Start your workspace" : "Welcome back"}</p><h2 className="font-kneeco-display mt-3 text-4xl tracking-[-0.035em] text-[#352C30]">{isSignUp ? "Care begins with context." : "Continue your clinical focus."}</h2><p className="mt-3 text-sm leading-6 text-[#7D6C72]">{isSignUp ? "Create your clinician profile first, then continue with authorised workspace access." : "KneeCo uses one secure authorised workspace sign-in—no password is collected here."}</p></div>
            {isSignUp ? <form onSubmit={submitSignup} className="space-y-5"><div className="grid gap-5 sm:grid-cols-2"><label className="space-y-2 text-sm font-bold text-[#514147]">Full name<Input required name="fullName" placeholder="Dr. Asha Raman" className="h-12 border-[#E9DDE0] bg-white focus-visible:ring-[#C97C8D]" /></label><label className="space-y-2 text-sm font-bold text-[#514147]">Clinic name<Input required name="clinicName" placeholder="Raman Orthopaedics" className="h-12 border-[#E9DDE0] bg-white focus-visible:ring-[#C97C8D]" /></label></div><label className="block space-y-2 text-sm font-bold text-[#514147]">Professional email<Input required name="email" type="email" autoComplete="email" placeholder="doctor@clinic.com" className="h-12 border-[#E9DDE0] bg-white focus-visible:ring-[#C97C8D]" /></label><div className="rounded-xl border border-[#F0E5E7] bg-[#FFFAFB] p-3.5 text-xs leading-5 text-[#79666D]"><span className="flex gap-2"><FileCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-[#A6556A]" />Professional licence upload is optional and will be available after your authorised profile is created.</span></div><Button type="submit" className="group h-13 w-full rounded-xl bg-[#C97C8D] text-sm font-extrabold text-white shadow-[0_14px_26px_-14px_rgba(166,85,106,0.8)] transition hover:bg-[#A6556A] active:scale-[0.98]">Continue to secure authorisation<ArrowUpRight className="ml-2 h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></Button></form> : <div className="space-y-5"><div className="rounded-xl border border-[#F0E5E7] bg-[#FFFAFB] p-4 text-sm leading-6 text-[#756269]"><span className="flex gap-3"><FileLock2 className="mt-0.5 h-4 w-4 shrink-0 text-[#A6556A]" />Your secure workspace provider manages authorisation. KneeCo never receives or stores your password.</span></div><Button type="button" onClick={startLogin} className="group h-13 w-full rounded-xl bg-[#C97C8D] text-sm font-extrabold text-white shadow-[0_14px_26px_-14px_rgba(166,85,106,0.8)] transition hover:bg-[#A6556A] active:scale-[0.98]">Continue with workspace account<ArrowUpRight className="ml-2 h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></Button></div>}
            <div className="mt-7 flex items-center justify-center gap-2 text-xs font-semibold text-[#948087]"><ShieldCheck className="h-4 w-4 text-[#A6556A]" /> Secure access for clinical teams</div><p className="mt-10 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-[#A28E94] lg:hidden">Powered by Elro Tech</p>
          </div>
        </section>
      </div>
    </main>
  );
}
