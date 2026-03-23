import type { ComponentManifest } from "@/types/sdui";

export default function SectionHeader({ manifest }: { manifest: ComponentManifest }) {
  const { title, subtitle } = manifest.props as Record<string, unknown>;

  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-900">{(title as string) ?? "Section"}</h2>
      {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle as string}</p>}
    </div>
  );
}
