import { KneeCoMark } from "@/components/KneeCoMark";
import { Button } from "@/components/ui/button";
import { endClinicianSession, getClinicianSession } from "@/lib/clinicianSession";
import { cn } from "@/lib/utils";
import { Archive, Boxes, FolderOpenDot, House, Menu, Plus, Settings2, X } from "lucide-react";
import { ReactNode, useState } from "react";
import { useLocation } from "wouter";

type KneeCoAppShellProps = {
  title: string;
  eyebrow: string;
  children: ReactNode;
};

const navigation = [
  { label: "Home", href: "/home", icon: House },
  { label: "Case Overview", href: "/cases", icon: FolderOpenDot },
  { label: "Implant Analysis", href: "/implant-analysis", icon: Boxes },
  { label: "Previous Cases", href: "/previous-cases", icon: Archive },
];

export function KneeCoAppShell({ title, eyebrow, children }: KneeCoAppShellProps) {
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("drawer") === "open";
  });
  const clinician = getClinicianSession(sessionStorage);

  const go = (href: string) => {
    setLocation(href);
    setMobileOpen(false);
  };

  const signOut = () => {
    endClinicianSession(sessionStorage);
    setLocation("/");
  };

  const sidebar = (
    <aside className="flex h-full w-[272px] flex-col bg-[#733963] px-5 py-6 text-white">
      <KneeCoMark size="sm" tone="inverse" />
      <div className="mt-10">
        <div className="mb-3 flex items-center justify-between px-3"><p className="text-[10px] font-extrabold uppercase tracking-[0.17em] text-white/70">Workspace</p><Button type="button" onClick={() => go("/new-case")} variant="ghost" className="h-7 rounded-lg bg-white/10 px-2 text-[10px] font-extrabold uppercase tracking-[0.1em] text-white hover:bg-[#C97C8D] hover:text-white"><Plus className="mr-1 h-3.5 w-3.5" />New Case</Button></div>
        <nav className="space-y-1.5" aria-label="KneeCo navigation">
          {navigation.map((item) => {
            const active = item.href === "/cases" ? location === "/cases" || (location.startsWith("/cases/") && !location.includes("/analysis")) : item.href === "/implant-analysis" ? location.startsWith("/implant-analysis") : item.href === "/previous-cases" ? location === "/previous-cases" : location === item.href;
            return <button key={item.href} type="button" onClick={() => go(item.href)} className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-extrabold transition", active ? "bg-[#C97C8D] text-white shadow-sm" : "text-white/85 hover:bg-white/10 hover:text-white")}><item.icon className="h-[18px] w-[18px]" />{item.label}</button>;
          })}
        </nav>
      </div>
      <div className="mt-auto"><button type="button" onClick={() => go("/settings")} className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-extrabold transition", location === "/settings" ? "bg-[#C97C8D] text-white shadow-sm" : "text-white/85 hover:bg-white/10 hover:text-white")}><Settings2 className="h-[18px] w-[18px]" />Settings</button></div>
      <div className="mt-4 rounded-2xl border border-white/15 bg-[#C97C8D] p-4 shadow-[0_18px_36px_-24px_rgba(20,6,18,0.9)]">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-white/70">Clinician account</p>
        <p className="mt-2 text-sm font-extrabold text-white">{clinician?.name ?? "Dr. Asha Raman"}</p>
        <p className="mt-1 text-xs leading-5 text-white/80">{clinician?.clinicName ?? "Raman Orthopaedics"}</p>
        <button type="button" onClick={signOut} className="mt-4 text-xs font-extrabold text-white hover:text-white/75">Sign out</button>
      </div>
      <p className="mt-5 text-center text-[10px] font-extrabold uppercase tracking-[0.14em] text-white/75">Powered by Elro Tech</p>
    </aside>
  );

  return (
    <div className="min-h-screen bg-[#FCF9F9] text-[#352C30]">
      <div className="hidden md:fixed md:inset-y-0 md:left-0 md:block">{sidebar}</div>
      <header className="sticky top-0 z-30 flex h-[72px] items-center border-b border-[#EEE4E6] bg-white/90 px-5 backdrop-blur md:ml-[272px] md:px-10">
        <div className="flex items-center gap-3"><button type="button" className="md:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu className="h-5 w-5" /></button><div><p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#A6556A]">{eyebrow}</p><h1 className="font-kneeco-display mt-0.5 text-2xl tracking-[-0.025em] text-[#352C30]">{title}</h1></div></div>
      </header>
      {mobileOpen && <div className="fixed inset-0 z-40 md:hidden"><button aria-label="Close navigation" className="absolute inset-0 bg-[#352C30]/20" onClick={() => setMobileOpen(false)} /><div className="relative h-full w-[290px] bg-white shadow-2xl"><button type="button" onClick={() => setMobileOpen(false)} className="absolute right-4 top-5 z-10 rounded-lg p-2 text-[#745E66] hover:bg-[#FBF1F3]" aria-label="Close navigation"><X className="h-5 w-5" /></button>{sidebar}</div></div>}
      <main className="px-5 py-8 md:ml-[272px] md:px-10 md:py-10">{children}</main>
    </div>
  );
}
