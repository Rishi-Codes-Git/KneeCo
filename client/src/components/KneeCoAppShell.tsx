import { KneeCoMark } from "@/components/KneeCoMark";
import { Button } from "@/components/ui/button";
import { endDemoSession, getDemoClinician } from "@/lib/demoSession";
import { cn } from "@/lib/utils";
import { FolderOpenDot, House, Menu, Plus, X } from "lucide-react";
import { ReactNode, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

type KneeCoAppShellProps = {
  title: string;
  eyebrow: string;
  children: ReactNode;
};

const navigation = [
  { label: "Home", href: "/home", icon: House },
  { label: "All Cases", href: "/cases", icon: FolderOpenDot },
];

export function KneeCoAppShell({ title, eyebrow, children }: KneeCoAppShellProps) {
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const clinician = getDemoClinician(sessionStorage);

  const go = (href: string) => {
    setLocation(href);
    setMobileOpen(false);
  };

  const exitDemo = () => {
    endDemoSession(sessionStorage);
    setLocation("/");
  };

  const sidebar = (
    <aside className="flex h-full w-[272px] flex-col border-r border-[#EEE4E6] bg-[#fffdfd] px-5 py-6">
      <KneeCoMark size="sm" />
      <div className="mt-10">
        <p className="mb-3 px-3 text-[10px] font-extrabold uppercase tracking-[0.17em] text-[#A18A91]">Workspace</p>
        <nav className="space-y-1.5" aria-label="KneeCo navigation">
          {navigation.map((item) => {
            const active = location === item.href;
            return <button key={item.href} type="button" onClick={() => go(item.href)} className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-extrabold transition", active ? "bg-[#F8E9EC] text-[#8E4F5D]" : "text-[#6F5E64] hover:bg-[#FCF4F5] hover:text-[#8E4F5D]")}><item.icon className="h-[18px] w-[18px]" />{item.label}</button>;
          })}
        </nav>
      </div>
      <div className="mt-auto rounded-2xl border border-[#F0E5E7] bg-[#FFFAFB] p-4">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#A08A91]">Demo clinician</p>
        <p className="mt-2 text-sm font-extrabold text-[#413239]">{clinician?.name ?? "Dr. Asha Raman"}</p>
        <p className="mt-1 text-xs leading-5 text-[#867179]">{clinician?.clinicName ?? "Raman Orthopaedics"}</p>
        <button type="button" onClick={exitDemo} className="mt-4 text-xs font-extrabold text-[#A6556A] hover:text-[#813E50]">Exit demo</button>
      </div>
      <p className="mt-5 text-center text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#A28E94]">Powered by Elro Tech</p>
    </aside>
  );

  return (
    <div className="min-h-screen bg-[#FCF9F9] text-[#352C30]">
      <div className="hidden md:fixed md:inset-y-0 md:left-0 md:block">{sidebar}</div>
      <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-[#EEE4E6] bg-white/90 px-5 backdrop-blur md:ml-[272px] md:px-10">
        <div className="flex items-center gap-3"><button type="button" className="md:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu className="h-5 w-5" /></button><div><p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#A6556A]">{eyebrow}</p><h1 className="font-kneeco-display mt-0.5 text-2xl tracking-[-0.025em] text-[#352C30]">{title}</h1></div></div>
        <Button type="button" onClick={() => toast.info("The New Case workflow is the next KneeCo screen to build.")} className="h-10 rounded-xl bg-[#C97C8D] px-4 text-sm font-extrabold text-white hover:bg-[#A6556A]"><Plus className="mr-1.5 h-4 w-4" />New Case</Button>
      </header>
      {mobileOpen && <div className="fixed inset-0 z-40 md:hidden"><button aria-label="Close navigation" className="absolute inset-0 bg-[#352C30]/20" onClick={() => setMobileOpen(false)} /><div className="relative h-full w-[290px] bg-white shadow-2xl"><button type="button" onClick={() => setMobileOpen(false)} className="absolute right-4 top-5 z-10 rounded-lg p-2 text-[#745E66] hover:bg-[#FBF1F3]" aria-label="Close navigation"><X className="h-5 w-5" /></button>{sidebar}</div></div>}
      <main className="px-5 py-8 md:ml-[272px] md:px-10 md:py-10">{children}</main>
    </div>
  );
}
