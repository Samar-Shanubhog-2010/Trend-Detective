import { useCallback, useState } from "react";
import { ArrowUpRight, Orbit } from "lucide-react";
import EnvironmentalIllustration from "@/components/EnvironmentalIllustration";
import NasaImageGallery from "@/components/NasaImageGallery";

export interface InvestigationPanelData {
  id: string;
  number: string;
  title: string;
  description: string;
  kind: "temperature" | "water" | "air";
  query: string;
  images: {
    src: string;
    alt: string;
    title: string;
    nasaId: string;
  }[];
}

const panelTheme = {
  temperature: {
    background: "panel-temperature",
    border: "border-red-300/30",
    accent: "text-red-100",
    status: "ATMOSPHERE / SURFACE",
  },
  water: {
    background: "panel-water",
    border: "border-emerald-300/30",
    accent: "text-emerald-100",
    status: "PRECIPITATION / LAND",
  },
  air: {
    background: "panel-air",
    border: "border-orange-100/40",
    accent: "text-orange-50",
    status: "AEROSOLS / TRACE GASES",
  },
};

export default function InvestigationPanel({
  investigation,
}: {
  investigation: InvestigationPanelData;
}) {
  const [galleryOpen, setGalleryOpen] = useState(false);
  const theme = panelTheme[investigation.kind];
  const closeGallery = useCallback(() => setGalleryOpen(false), []);

  return (
    <>
      <article
        className={`investigation-panel ${theme.background} ${theme.border}`}
        aria-labelledby={`${investigation.id}-title`}
      >
        <div className="investigation-panel-text">
          <div className="mb-6 flex items-center justify-between gap-5">
            <p className={`investigation-number ${theme.accent}`}>
              <span>{investigation.number}</span>
              <span className="investigation-number-rule" />
              <span className="text-[9px] tracking-[0.22em]">{theme.status}</span>
            </p>
            <span className="panel-orbit-mark" aria-hidden="true">
              <Orbit size={17} />
            </span>
          </div>

          <h3 id={`${investigation.id}-title`} className="investigation-title">
            {investigation.title}
          </h3>
          <p className="investigation-description">{investigation.description}</p>

          <button
            type="button"
            className="gallery-launch"
            onClick={() => setGalleryOpen(true)}
            aria-label={`Explore NASA images for ${investigation.title}`}
          >
            EXPLORE IMAGES <ArrowUpRight size={16} />
          </button>
        </div>

        <div className="investigation-panel-art">
          <EnvironmentalIllustration kind={investigation.kind} />
          <div className="panel-imagery" role="group" aria-label="NASA satellite images">
            {investigation.images.map((image) => (
              <a
                className="panel-image-tile"
                key={image.nasaId}
                href={`https://images.nasa.gov/details/${image.nasaId}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${image.title} — open NASA image details in a new tab`}
              >
                <img src={image.src} alt={image.alt} loading="lazy" />
                <span className="panel-image-caption">
                  <span>{image.title}</span>
                  <ArrowUpRight size={14} aria-hidden="true" />
                </span>
              </a>
            ))}
          </div>
          <span className="illustration-disclaimer">NASA SATELLITE IMAGERY</span>
        </div>
      </article>

      {galleryOpen && (
        <NasaImageGallery
          title={investigation.title}
          query={investigation.query}
          onClose={closeGallery}
        />
      )}
    </>
  );
}
