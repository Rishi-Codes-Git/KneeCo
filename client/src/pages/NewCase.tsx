import { KneeCoAppShell } from "@/components/KneeCoAppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NewCaseFieldErrors, validateNewCaseForm } from "@/lib/caseFormValidation";
import { getMriIntakeError, maxMriIntakeBytes } from "@/lib/mriIntake";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, ArrowRight, CheckCircle2, FileUp, ImageIcon, Loader2, ShieldCheck, X } from "lucide-react";
import { ChangeEvent, FormEvent, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

type CaseForm = {
  patientId: string;
  patientName: string;
  age: string;
  sex: "female" | "male" | "intersex" | "not_recorded";
  oaStatus: "yes" | "no" | "unknown";
  lifestyleContext: string;
  kneeSide: "left" | "right" | "bilateral" | "unknown";
};

const initialForm: CaseForm = {
  patientId: "",
  patientName: "",
  age: "",
  sex: "not_recorded",
  oaStatus: "unknown",
  lifestyleContext: "",
  kneeSide: "unknown",
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("The MRI file could not be read."));
    reader.onload = () => {
      const value = String(reader.result);
      resolve(value.includes(",") ? value.split(",")[1] : value);
    };
    reader.readAsDataURL(file);
  });
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="mb-2 block text-sm font-extrabold text-[#4A3A40]">{children}</span>;
}

export default function NewCase() {
  const [, setLocation] = useLocation();
  const [form, setForm] = useState<CaseForm>(initialForm);
  const [scan, setScan] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<NewCaseFieldErrors>({});
  const createCase = trpc.cases.create.useMutation();

  const update = <K extends keyof CaseForm>(key: K, value: CaseForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (key === "patientId" || key === "patientName" || key === "age") {
      setFieldErrors((current) => ({ ...current, [key]: undefined }));
    }
  };

  const selectScan = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setError(null);
    if (!file) return setScan(null);
    const validationError = getMriIntakeError(file.name, file.size);
    if (validationError) {
      setScan(null);
      setError(validationError);
      return;
    }
    setScan(file);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const validationErrors = validateNewCaseForm(form);
    setFieldErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      setError("Complete the highlighted patient details before creating the case.");
      return;
    }
    if (!scan) {
      setError("Attach a JPG, JPEG, PNG, or PDF knee study before creating the case.");
      return;
    }
    const age = Number(form.age);
    try {
      const contentBase64 = await fileToBase64(scan);
      createCase.mutate(
        {
          patientId: form.patientId.trim(),
          patientName: form.patientName.trim(),
          age,
          sex: form.sex,
          oaStatus: form.oaStatus,
          lifestyleContext: form.lifestyleContext.trim() || undefined,
          kneeSide: form.kneeSide,
          scan: {
            fileName: scan.name,
            contentType: scan.type || "application/octet-stream",
            sizeBytes: scan.size,
            contentBase64,
          },
        },
        {
          onSuccess: ({ caseReference, safeMessage }) => {
            toast.success(`Case ${caseReference} has been created.`);
            toast.info(safeMessage);
            setLocation("/cases");
          },
          onError: () => setError("The case could not be created. Check the highlighted intake details and try again."),
        },
      );
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "The MRI file could not be prepared.");
    }
  };

  return (
    <KneeCoAppShell eyebrow="Clinical intake" title="New Case">
      <div className="mx-auto max-w-6xl">
        <button type="button" onClick={() => setLocation("/home")} className="mb-6 flex items-center gap-2 text-sm font-extrabold text-[#86646D] transition hover:text-[#733963]"><ArrowLeft className="h-4 w-4" />Back to Home</button>
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[0.17em] text-[#A6556A]">A precise starting point</p><h2 className="font-kneeco-display mt-3 text-4xl tracking-[-0.04em] text-[#352C30]">Create a clinical case.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-[#7A676E]">Record the patient context and attach the knee MRI that will enter KneeCo’s reviewable analysis pathway.</p></div><div className="rounded-xl border border-[#F1E4E7] bg-white px-4 py-3 text-sm text-[#795F67]"><span className="font-extrabold text-[#A6556A]">Step 1 of 2</span><span className="ml-2">Intake and scan attachment</span></div></div>

        <form onSubmit={submit} className="grid gap-7 lg:grid-cols-[1fr_340px]">
          <div className="space-y-7">
            <section className="rounded-[1.6rem] border border-[#EDE3E5] bg-white p-6 shadow-[0_18px_45px_-38px_rgba(92,49,61,0.38)] sm:p-8">
              <div className="flex items-start justify-between gap-5"><div><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#A6556A]">Patient context</p><h3 className="mt-2 text-xl font-extrabold text-[#3E3036]">Essential identifiers</h3></div><span className="rounded-full bg-[#FBF0F2] px-3 py-1.5 text-[11px] font-extrabold text-[#995969]">Required</span></div>
              <div className="mt-7 grid gap-5 sm:grid-cols-2"><label><FieldLabel>Patient ID</FieldLabel><Input required aria-invalid={Boolean(fieldErrors.patientId)} aria-describedby={fieldErrors.patientId ? "patient-id-error" : undefined} value={form.patientId} onChange={(event) => update("patientId", event.target.value)} placeholder="KC-PT-0001" className="h-12 border-[#E8DDDF] focus-visible:ring-[#C97C8D]" />{fieldErrors.patientId && <span id="patient-id-error" className="mt-2 block text-xs font-semibold text-[#A04658]">{fieldErrors.patientId}</span>}</label><label><FieldLabel>Patient name</FieldLabel><Input required aria-invalid={Boolean(fieldErrors.patientName)} aria-describedby={fieldErrors.patientName ? "patient-name-error" : undefined} value={form.patientName} onChange={(event) => update("patientName", event.target.value)} placeholder="Full patient name" className="h-12 border-[#E8DDDF] focus-visible:ring-[#C97C8D]" />{fieldErrors.patientName && <span id="patient-name-error" className="mt-2 block text-xs font-semibold text-[#A04658]">{fieldErrors.patientName}</span>}</label></div>
              <div className="mt-5 grid gap-5 sm:grid-cols-3"><label><FieldLabel>Age</FieldLabel><Input required aria-invalid={Boolean(fieldErrors.age)} aria-describedby={fieldErrors.age ? "age-error" : undefined} value={form.age} onChange={(event) => update("age", event.target.value)} inputMode="numeric" placeholder="Years" className="h-12 border-[#E8DDDF] focus-visible:ring-[#C97C8D]" />{fieldErrors.age && <span id="age-error" className="mt-2 block text-xs font-semibold text-[#A04658]">{fieldErrors.age}</span>}</label><label><FieldLabel>Sex</FieldLabel><select value={form.sex} onChange={(event) => update("sex", event.target.value as CaseForm["sex"])} className="h-12 w-full rounded-xl border border-[#E8DDDF] bg-white px-3 text-sm font-semibold text-[#4A3A40] outline-none focus:ring-2 focus:ring-[#C97C8D]"><option value="not_recorded">Not recorded</option><option value="female">Female</option><option value="male">Male</option><option value="intersex">Intersex</option></select></label><label><FieldLabel>Knee side</FieldLabel><select value={form.kneeSide} onChange={(event) => update("kneeSide", event.target.value as CaseForm["kneeSide"])} className="h-12 w-full rounded-xl border border-[#E8DDDF] bg-white px-3 text-sm font-semibold text-[#4A3A40] outline-none focus:ring-2 focus:ring-[#C97C8D]"><option value="unknown">Not recorded</option><option value="left">Left</option><option value="right">Right</option><option value="bilateral">Bilateral</option></select></label></div>
            </section>

            <section className="rounded-[1.6rem] border border-[#EDE3E5] bg-white p-6 shadow-[0_18px_45px_-38px_rgba(92,49,61,0.38)] sm:p-8">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#A6556A]">Clinical reference</p><h3 className="mt-2 text-xl font-extrabold text-[#3E3036]">OA and lifestyle context</h3><p className="mt-2 text-sm leading-6 text-[#7D6A71]">These fields support clinician context and later analytics. They do not change an anatomical measurement.</p>
              <div className="mt-6 grid gap-5 sm:grid-cols-2"><label><FieldLabel>Known osteoarthritis status</FieldLabel><select value={form.oaStatus} onChange={(event) => update("oaStatus", event.target.value as CaseForm["oaStatus"])} className="h-12 w-full rounded-xl border border-[#E8DDDF] bg-white px-3 text-sm font-semibold text-[#4A3A40] outline-none focus:ring-2 focus:ring-[#C97C8D]"><option value="unknown">Unknown</option><option value="yes">Yes</option><option value="no">No</option></select></label><label><FieldLabel>Lifestyle context <span className="font-medium text-[#A18B91]">(optional)</span></FieldLabel><Input value={form.lifestyleContext} onChange={(event) => update("lifestyleContext", event.target.value)} placeholder="e.g. active, sedentary, load-bearing work" className="h-12 border-[#E8DDDF] focus-visible:ring-[#C97C8D]" /></label></div>
            </section>

            <section className="rounded-[1.6rem] border border-[#EDE3E5] bg-white p-6 shadow-[0_18px_45px_-38px_rgba(92,49,61,0.38)] sm:p-8">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#A6556A]">Knee study attachment</p><h3 className="mt-2 text-xl font-extrabold text-[#3E3036]">Attach image or PDF</h3><p className="mt-2 text-sm leading-6 text-[#7D6A71]">KneeCo accepts JPG, JPEG, PNG, or PDF studies for technical preflight and later clinician-reviewed analysis. Maximum intake size: 20 MB.</p>
              <label className="mt-6 flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[#D9B8C0] bg-[#FFFAFB] px-6 text-center transition hover:border-[#C97C8D] hover:bg-[#FFF7F8]"><input type="file" accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf" onChange={selectScan} className="sr-only" /><FileUp className="h-7 w-7 text-[#A6556A]" /><span className="mt-3 text-sm font-extrabold text-[#513D44]">Choose knee image or PDF</span><span className="mt-1 text-xs text-[#8A747B]">JPG · JPEG · PNG · PDF</span></label>
              {scan && <div className="mt-4 flex items-center justify-between rounded-xl border border-[#E7D8DC] bg-white px-4 py-3"><div className="flex min-w-0 items-center gap-3"><ImageIcon className="h-5 w-5 shrink-0 text-[#A6556A]" /><div className="min-w-0"><p className="truncate text-sm font-extrabold text-[#4A393F]">{scan.name}</p><p className="mt-0.5 text-xs text-[#887279]">{(scan.size / 1024 / 1024).toFixed(2)} MB · Ready to attach</p></div></div><button type="button" onClick={() => setScan(null)} className="rounded-lg p-1.5 text-[#A6556A] hover:bg-[#FBF0F2]" aria-label="Remove selected MRI"><X className="h-4 w-4" /></button></div>}
            </section>
          </div>

          <aside className="h-fit rounded-[1.6rem] border border-[#E5D8DC] bg-white p-6 shadow-[0_18px_45px_-38px_rgba(92,49,61,0.38)] lg:sticky lg:top-24"><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#A6556A]">Case readiness</p><h3 className="mt-3 text-xl font-extrabold text-[#3E3036]">Ready when complete.</h3><div className="mt-6 space-y-4 text-sm text-[#735F67]"><p className="flex gap-3"><CheckCircle2 className={`h-5 w-5 shrink-0 ${form.patientId && form.patientName ? "text-[#A6556A]" : "text-[#D9C8CC]"}`} />Patient identity</p><p className="flex gap-3"><CheckCircle2 className={`h-5 w-5 shrink-0 ${form.age && form.kneeSide !== "unknown" ? "text-[#A6556A]" : "text-[#D9C8CC]"}`} />Clinical context</p><p className="flex gap-3"><CheckCircle2 className={`h-5 w-5 shrink-0 ${scan ? "text-[#A6556A]" : "text-[#D9C8CC]"}`} />Image or PDF study</p></div><div className="mt-7 flex gap-2 rounded-xl border border-[#F0E5E7] bg-[#FFFAFB] p-4 text-xs leading-5 text-[#79666D]"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#A6556A]" /><p>The study is stored securely and undergoes technical preflight when FastAPI is available. Anatomy segmentation, millimetre measurements, and implant candidates remain clinician-reviewed and require a validated model.</p></div>{error && <p role="alert" className="mt-5 rounded-xl bg-[#FFF0F1] p-3 text-sm font-semibold text-[#A04658]">{error}</p>}<Button disabled={createCase.isPending} type="submit" className="mt-6 h-12 w-full rounded-xl bg-[#C97C8D] text-sm font-extrabold text-white hover:bg-[#A6556A] disabled:opacity-70">{createCase.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating case</> : <>Create Case & Preflight<ArrowRight className="ml-2 h-4 w-4" /></>}</Button><p className="mt-4 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-[#A18A91]">Decision support only</p></aside>
        </form>
      </div>
    </KneeCoAppShell>
  );
}
