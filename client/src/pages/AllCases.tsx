import { KneeCoAppShell } from "@/components/KneeCoAppShell";
import { Button } from "@/components/ui/button";
import { ClipboardList, Plus } from "lucide-react";
import { toast } from "sonner";

export default function AllCases() {
  return (
    <KneeCoAppShell eyebrow="Case archive" title="All Cases">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-[1.75rem] border border-[#EFE4E6] bg-white p-7 shadow-[0_18px_45px_-35px_rgba(92,49,61,0.35)] sm:p-10">
          <div className="flex flex-col gap-7 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[0.17em] text-[#A6556A]">Organised by clinician</p><h2 className="font-kneeco-display mt-3 text-4xl tracking-[-0.035em] text-[#352C30]">Your case archive.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-[#7B686F]">Cases will stay together with their scan, analysis status, clinician review, and final decision-support report.</p></div><Button type="button" onClick={() => toast.info("The New Case workflow is the next KneeCo screen to build.")} className="rounded-xl bg-[#C97C8D] text-white hover:bg-[#A6556A]"><Plus className="mr-1.5 h-4 w-4" />New Case</Button></div>
          <div className="mt-10 flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-[#E7D3D7] bg-[#FFFAFB] p-8 text-center"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F4E0E4] text-[#A6556A]"><ClipboardList className="h-5 w-5" /></div><h3 className="mt-5 text-lg font-extrabold text-[#45353B]">No cases to display</h3><p className="mt-2 max-w-sm text-sm leading-6 text-[#806C73]">Create a new case to begin building your clinician-reviewed archive.</p></div>
        </section>
      </div>
    </KneeCoAppShell>
  );
}
