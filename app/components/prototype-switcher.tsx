// PROTOTYPE — throwaway. Floating variant switcher for UI prototypes.
// Lives only on prototype/* branches; never merge to main.
import { useEffect } from "react";
import { useSearchParams } from "react-router";

export function PrototypeSwitcher({
  variants,
  status,
}: {
  variants: { key: string; name: string }[];
  status?: string;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const current = searchParams.get("variant") ?? variants[0].key;
  const index = Math.max(
    0,
    variants.findIndex((v) => v.key === current)
  );

  function go(delta: number) {
    const next = variants[(index + delta + variants.length) % variants.length];
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.set("variant", next.key);
        p.delete("inbox");
        return p;
      },
      { replace: true }
    );
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable)
      )
        return;
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (process.env.NODE_ENV === "production") return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-3 rounded-full bg-fuchsia-700 px-4 py-2 font-mono text-xs text-white shadow-xl ring-2 ring-fuchsia-300">
      <button onClick={() => go(-1)} className="px-1 hover:opacity-70">
        ◀
      </button>
      <span>
        PROTOTYPE {variants[index].key} ({variants[index].name})
        {status ? ` · ${status}` : ""}
      </span>
      <button onClick={() => go(1)} className="px-1 hover:opacity-70">
        ▶
      </button>
    </div>
  );
}
