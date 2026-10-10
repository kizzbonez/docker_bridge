/** Fixed backdrop: dot grid plus two slow "breathing" glows. Purely decorative. */
export function Atmosphere() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="dot-grid absolute inset-0" />
      <div className="absolute -top-48 left-1/2 h-[34rem] w-[58rem] -translate-x-1/2 animate-breathe rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="absolute top-1/2 -right-40 h-[26rem] w-[26rem] animate-breathe rounded-full bg-emerald-500/5 blur-3xl [animation-delay:-3.5s]" />
    </div>
  );
}
