type KneeCoMarkProps = {
  size?: "sm" | "md";
  tone?: "default" | "inverse";
};

export function KneeCoMark({ size = "md", tone = "default" }: KneeCoMarkProps) {
  const imageSize = size === "sm" ? "h-10 w-10" : "h-14 w-14";
  const titleSize = size === "sm" ? "text-xl" : "text-2xl";
  const inverse = tone === "inverse";

  return (
    <div className="flex items-center gap-3">
      <img
        src={import.meta.env.VITE_APP_LOGO}
        alt="KneeCo logo"
        className={`${imageSize} shrink-0 object-contain`}
      />
      <div>
        <p className={`font-kneeco-display leading-none ${inverse ? "text-white" : "text-[#352C30]"} ${titleSize}`}>KneeCo</p>
        <p className={`mt-1 text-[10px] font-extrabold uppercase tracking-[0.18em] ${inverse ? "text-white/80" : "text-[#9C6570]"}`}>Doctor&apos;s Knee Companion</p>
      </div>
    </div>
  );
}
