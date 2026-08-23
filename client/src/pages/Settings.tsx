import { KneeCoAppShell } from "@/components/KneeCoAppShell";
import { Button } from "@/components/ui/button";
import { defaultClinicianSession, getClinicianSession, updateClinicianSession } from "@/lib/clinicianSession";
import { BellRing, CheckCircle2, ShieldCheck, UserRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type WorkspacePreferences = { caseNotifications: boolean; measurementReview: boolean; compactTables: boolean };
const preferenceKey = "kneeco-workspace-preferences";
const defaultPreferences: WorkspacePreferences = { caseNotifications: true, measurementReview: true, compactTables: false };

function readPreferences(): WorkspacePreferences {
  try {
    const saved = sessionStorage.getItem(preferenceKey);
    return saved ? { ...defaultPreferences, ...(JSON.parse(saved) as Partial<WorkspacePreferences>) } : defaultPreferences;
  } catch {
    return defaultPreferences;
  }
}

export default function Settings() {
  const [clinician, setClinician] = useState(() => getClinicianSession(sessionStorage) ?? defaultClinicianSession);
  const [preferences, setPreferences] = useState<WorkspacePreferences>(readPreferences);
  const [saved, setSaved] = useState(false);
  const update = (key: keyof typeof clinician, value: string) => setClinician((current) => ({ ...current, [key]: value }));
  const toggle = (key: keyof WorkspacePreferences) => setPreferences((current) => ({ ...current, [key]: !current[key] }));
  const save = () => { updateClinicianSession(sessionStorage, clinician); sessionStorage.setItem(preferenceKey, JSON.stringify(preferences)); setSaved(true); toast.success("Workspace settings updated."); };
  const preferenceRows: Array<{ key: keyof WorkspacePreferences; label: string; description: string }> = [
    { key: "caseNotifications", label: "Case lifecycle updates", description: "Show in-workspace confirmations when cases are confirmed or closed." },
    { key: "measurementReview", label: "Measurement review reminder", description: "Keep clinician-review guidance visible in assessment and planning workspaces." },
    { key: "compactTables", label: "Compact case tables", description: "Use denser rows in the Case Overview and Previous Cases archives." },
  ];
  return <KneeCoAppShell eyebrow="Workspace" title="Settings"><div className="mx-auto max-w-5xl"><section className="rounded-[1.75rem] border border-[#EFE4E6] bg-white p-7 shadow-[0_18px_45px_-35px_rgba(92,49,61,0.35)] sm:p-9"><p className="text-xs font-extrabold uppercase tracking-[0.17em] text-[#A6556A]">Clinician profile</p><h2 className="font-kneeco-display mt-3 text-4xl tracking-[-0.04em] text-[#352C30]">Workspace settings</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-[#7A676E]">Maintain your professional details and review preferences for this KneeCo workspace.</p></section><div className="mt-7 grid gap-7 lg:grid-cols-[1.3fr_.7fr]"><div className="space-y-7"><section className="rounded-[1.5rem] border border-[#EDE3E5] bg-white p-6"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F8E7EB] text-[#A6556A]"><UserRound className="h-5 w-5" /></span><div><h3 className="font-extrabold text-[#493940]">Profile details</h3><p className="text-xs text-[#806C73]">Visible in the workspace account panel.</p></div></div><div className="mt-6 grid gap-5"><label className="text-sm font-extrabold text-[#59464D]">Full name<input value={clinician.name} onChange={(event) => update("name", event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-[#E6DADD] bg-white px-3 text-sm font-semibold outline-none ring-[#C97C8D] focus:ring-2" /></label><label className="text-sm font-extrabold text-[#59464D]">Clinic name<input value={clinician.clinicName} onChange={(event) => update("clinicName", event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-[#E6DADD] bg-white px-3 text-sm font-semibold outline-none ring-[#C97C8D] focus:ring-2" /></label><label className="text-sm font-extrabold text-[#59464D]">Professional email<input type="email" value={clinician.email} onChange={(event) => update("email", event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-[#E6DADD] bg-white px-3 text-sm font-semibold outline-none ring-[#C97C8D] focus:ring-2" /></label></div></section><section className="rounded-[1.5rem] border border-[#EDE3E5] bg-white p-6"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F8E7EB] text-[#A6556A]"><BellRing className="h-5 w-5" /></span><div><h3 className="font-extrabold text-[#493940]">Workspace preferences</h3><p className="text-xs text-[#806C73]">Saved to this clinician browser workspace.</p></div></div><div className="mt-5 divide-y divide-[#F0E7E9]">{preferenceRows.map((row) => <div key={row.key} className="flex gap-4 py-4 first:pt-0 last:pb-0"><button type="button" role="switch" aria-checked={preferences[row.key]} onClick={() => toggle(row.key)} className={`mt-0.5 flex h-6 w-11 shrink-0 items-center rounded-full p-1 transition ${preferences[row.key] ? "bg-[#733963]" : "bg-[#E7DCE0]"}`}><span className={`h-4 w-4 rounded-full bg-white shadow-sm transition ${preferences[row.key] ? "translate-x-5" : "translate-x-0"}`} /></button><div><p className="text-sm font-extrabold text-[#493940]">{row.label}</p><p className="mt-1 text-xs leading-5 text-[#806C73]">{row.description}</p></div></div>)}</div></section><Button type="button" onClick={save} className="rounded-xl bg-[#C97C8D] text-white hover:bg-[#A6556A]">Save settings</Button>{saved && <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-[#397B5D]"><CheckCircle2 className="h-4 w-4" />Changes are active in this browser workspace.</p>}</div><aside className="space-y-4"><section className="rounded-[1.5rem] border border-[#EDE3E5] bg-white p-6"><ShieldCheck className="h-5 w-5 text-[#A6556A]" /><h3 className="mt-4 font-extrabold text-[#493940]">Review boundary</h3><p className="mt-2 text-sm leading-6 text-[#806C73]">Implant candidates are ranked from anonymized four-dimension references and require clinician confirmation.</p></section><section className="rounded-[1.5rem] border border-[#EDE3E5] bg-white p-6"><BellRing className="h-5 w-5 text-[#A6556A]" /><h3 className="mt-4 font-extrabold text-[#493940]">Notifications</h3><p className="mt-2 text-sm leading-6 text-[#806C73]">Preference toggles control in-workspace review behavior. External notifications can be connected later.</p></section></aside></div></div></KneeCoAppShell>;
}
