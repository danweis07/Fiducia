import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import type { ComponentManifest } from "@/types/sdui";

export default function CTAButton({ manifest }: { manifest: ComponentManifest }) {
  const {
    label = "Get Started",
    link = "/",
    variant = "default",
    fullWidth = false,
  } = manifest.props as Record<string, unknown>;

  return (
    <Button
      asChild
      variant={variant as "default" | "outline" | "secondary"}
      className={fullWidth ? "w-full" : ""}
    >
      <Link to={link as string}>{label as string}</Link>
    </Button>
  );
}
