import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Play, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * TODO(spot): set to true once WineExporters_spot_30s_V6.mp4 is really hosted
 * at public/videos/. While false, no player and no clickable thumbnail render.
 */
export const SPOT_VIDEO_ENABLED = false;
export const SPOT_VIDEO_SRC = "/videos/WineExporters_spot_30s_V6.mp4";

/** No analytics tool is installed; this hook point stays a no-op. */
const trackSpot = (_event: "open" | "play" | "ended" | "cta") => {};

const Thumbnail = ({ label }: { label: string }) => (
  <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary/80 flex flex-col items-center justify-center text-primary-foreground">
    <span className="font-display text-2xl sm:text-3xl font-bold tracking-tight">WineExporters</span>
    <span className="mt-2 text-sm opacity-80">{label}</span>
  </div>
);

export const SpotVideo = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  if (!SPOT_VIDEO_ENABLED) return null;

  const onOpenChange = (next: boolean) => {
    if (!next) videoRef.current?.pause();
    else trackSpot("open");
    setOpen(next);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        aria-label={t("landing.spot.play")}
        className="group relative block w-full aspect-video overflow-hidden rounded-2xl shadow-xl shadow-primary/20 ring-1 ring-border focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/40"
      >
        <Thumbnail label={t("landing.spot.label")} />
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="mt-24 sm:mt-28 flex h-16 w-16 items-center justify-center rounded-full bg-background text-primary shadow-lg transition-transform group-hover:scale-110">
            <Play className="h-7 w-7 ml-1" fill="currentColor" />
          </span>
        </span>
      </button>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl w-[calc(100vw-2rem)] p-4 sm:p-6">
          <DialogTitle>{t("landing.spot.title")}</DialogTitle>
          <DialogDescription>{t("landing.spot.description")}</DialogDescription>
          <div className="aspect-video w-full overflow-hidden rounded-lg bg-muted">
            {failed ? (
              <div className="flex h-full items-center justify-center p-6 text-center text-muted-foreground">
                {t("landing.spot.error")}
              </div>
            ) : (
              open && (
                <video
                  ref={videoRef}
                  src={SPOT_VIDEO_SRC}
                  controls
                  playsInline
                  preload="none"
                  lang="fr"
                  className="h-full w-full"
                  onPlay={() => trackSpot("play")}
                  onEnded={() => trackSpot("ended")}
                  onError={() => setFailed(true)}
                />
              )
            )}
          </div>
          <Button asChild size="lg" className="w-full sm:w-auto sm:self-start">
            <Link to="/market-analysis" onClick={() => trackSpot("cta")}>
              {t("landing.spot.cta")}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
};
