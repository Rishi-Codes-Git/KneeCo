import { KneeCoAppShell } from "@/components/KneeCoAppShell";
import { Button } from "@/components/ui/button";
import { ArrowRight, FileSearch, ScanLine, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function HomeDashboard() {
  const [, setLocation] = useLocation();

  return (
    <KneeCoAppShell eyebrow="Clinical overview" title="Home">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-[1.75rem] border border-[#EFE4E6] bg-white p-7 shadow-[0_18px_45px_-35px_rgba(92,49,61,0.35)] sm:p-10">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div><p className="text-xs font-extrabold uppercase tracking-[0.17em] text-[#A6556A]">A considered first look</p><h2 className="font-kneeco-display mt-4 max-w-xl text-4xl leading-[1.08] tracking-[-0.04em] text-[#352C30] sm:text-5xl">Every clearer case starts with one scan.</h2><p className="mt-5 max-w-xl text-sm leading-7 text-[#77666C]">Create your first KneeCo case to organise MRI context, automatic analysis status, and clinician-reviewed reporting in one workspace.</p></div>
            <div className="rounded-2xl bg-[#FBF0F2] p-6"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#C97C8D] text-white"><ScanLine className="h-5 w-5" /></div><p className="mt-5 text-lg font-extrabold text-[#44343A]">No case activity yet</p><p className="mt-2 text-sm leading-6 text-[#806C73]">Your case list is empty. Begin with a new scan when you are ready.</p><Button type="button" onClick={() => toast.info("The New Case workflow is the next KneeCo screen to build.")} variant="link" className="mt-3 h-auto px-0 text-sm font-extrabold text-[#A6556A] hover:text-[#813E50]">Prepare a new case<ArrowRight className="ml-1.5 h-4 w-4" /></Button></div>
          </div>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-3">
          {[{ icon: FileSearch, title: "Case-led", text: "A clear place for imaging context, review notes and reports." }, { icon: ShieldCheck, title: "Clinician verified", text: "AI-assisted output remains reviewable before it is saved." }, { icon: ScanLine, title: "Model-ready", text: "Automatic MRI analysis will activate after controlled validation." }].map((item) => <div key={item.title} className="rounded-2xl border border-[#EFE4E6] bg-white p-6"><item.icon className="h-5 w-5 text-[#A6556A]" /><h3 className="mt-5 text-sm font-extrabold text-[#44343A]">{item.title}</h3><p className="mt-2 text-sm leading-6 text-[#7D6B71]">{item.text}</p></div>)}
        </section>

        <section className="mt-8 flex flex-col items-start justify-between gap-5 rounded-2xl border border-dashed border-[#E8D1D6] bg-[#fffdfd] p-6 sm:flex-row sm:items-center"><div><p className="font-extrabold text-[#44343A]">Want to revisit a saved study?</p><p className="mt-1 text-sm text-[#806C73]">All completed and in-progress cases will appear in the case archive.</p></div><Button type="button" onClick={() => setLocation("/cases")} variant="outline" className="rounded-xl border-[#E2CBD1] bg-white text-[#8E4F5D] hover:bg-[#FBF1F3]">View all cases</Button></section>
      </div>
    </KneeCoAppShell>
  );
}
