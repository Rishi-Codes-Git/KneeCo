import { KneeCoMark } from "@/components/KneeCoMark";
import { Button } from "@/components/ui/button";
import { defaultDemoClinician, startDemoSession } from "@/lib/demoSession";
import { ArrowUpRight, Beaker, ShieldCheck } from "lucide-react";
import { useLocation } from "wouter";

export default function MockAccess() {
  const [, setLocation] = useLocation();

  const enterWorkspace = () => {
    startDemoSession(sessionStorage);
    setLocation("/home");
  };

  return (
    <main className="auth-mesh flex min-h-screen items-center justify-center p-4 sm:p-6">
      <section className="w-full max-w-[520px] rounded-[2rem] border border-[#EADDE0] bg-white p-8 shadow-[0_24px_70px_-38px_rgba(92,49,61,0.36)] sm:p-12">
        <div className="flex justify-center"><KneeCoMark /></div>
        <div className="mx-auto mt-10 flex h-14 w-14 items-center justify-center rounded-full bg-[#F9E8EB] text-[#A6556A]"><Beaker className="h-6 w-6" /></div>
        <p className="mt-6 text-center text-xs font-extrabold uppercase tracking-[0.17em] text-[#A6556A]">Hackathon prototype access</p>
        <h1 className="font-kneeco-display mt-3 text-center text-4xl tracking-[-0.035em] text-[#352C30]">Enter the clinical workspace.</h1>
        <p className="mx-auto mt-4 max-w-sm text-center text-sm leading-6 text-[#78676D]">This prototype uses prefilled mock clinician data. No password, external account, or personal information is required.</p>

        <div className="mt-8 rounded-2xl border border-[#F0E5E7] bg-[#FFFAFB] p-5">
          <p className="text-xs font-extrabold uppercase tracking-[0.15em] text-[#A6556A]">Demo clinician</p>
          <p className="mt-3 text-lg font-extrabold text-[#403338]">{defaultDemoClinician.name}</p>
          <p className="mt-1 text-sm text-[#7A686F]">{defaultDemoClinician.clinicName}</p>
        </div>

        <Button type="button" onClick={enterWorkspace} className="group mt-7 h-13 w-full rounded-xl bg-[#C97C8D] text-sm font-extrabold text-white shadow-[0_14px_26px_-14px_rgba(166,85,106,0.8)] transition hover:bg-[#A6556A] active:scale-[0.98]">Enter KneeCo demo<ArrowUpRight className="ml-2 h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></Button>
        <p className="mt-7 flex justify-center gap-2 text-center text-xs leading-5 text-[#8D787F]"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#A6556A]" />Decision support only—not a final diagnosis.</p>
        <p className="mt-10 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-[#A28E94]">Powered by Elro Tech</p>
      </section>
    </main>
  );
}
