import { cn } from "@/lib/utils";
import logoFull from "@/assets/wineexporters-burgundy.png.asset.json";
import logoMark from "@/assets/we-burgundy.png.asset.json";
import logoMarkCream from "@/assets/we-cream.png.asset.json";
import logoWhite from "@/assets/wineexporters-white-burgundy.png.asset.json";

type BrandLogoVariant = "full" | "mark" | "markCream" | "white";

const logos = {
  full: logoFull,
  mark: logoMark,
  markCream: logoMarkCream,
  white: logoWhite,
};

interface BrandLogoProps {
  variant?: BrandLogoVariant;
  className?: string;
}

export function BrandLogo({ variant = "full", className }: BrandLogoProps) {
  const isMark = variant === "mark" || variant === "markCream";

  return (
    <img
      src={logos[variant].url}
      alt="WineExporters"
      width={isMark ? 512 : 900}
      height={isMark ? 512 : 240}
      className={cn("block object-contain", className)}
    />
  );
}