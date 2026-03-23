import type { ComponentManifest } from "@/types/sdui";

export default function Spacer({ manifest }: { manifest: ComponentManifest }) {
  const height = (manifest.props.height as number) ?? 24;
  return <div style={{ height: `${height}px` }} aria-hidden />;
}
