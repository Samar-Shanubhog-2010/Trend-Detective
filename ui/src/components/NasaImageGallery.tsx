import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ExternalLink, X } from "lucide-react";

export interface NasaGalleryImage {
  title: string;
  nasaId: string;
  imageUrl: string;
  alt: string;
  description: string;
  credit: string;
  date: string;
  sourceUrl: string;
}

interface NasaImageGalleryProps {
  title: string;
  images: NasaGalleryImage[];
  onClose: () => void;
}

export default function NasaImageGallery({
  title,
  images,
  onClose,
}: NasaImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [failedImageId, setFailedImageId] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [onClose]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key === "ArrowRight") {
        setActiveIndex((index) => (index + 1) % Math.max(images.length, 1));
      } else if (event.key === "ArrowLeft") {
        setActiveIndex((index) => (index - 1 + Math.max(images.length, 1)) % Math.max(images.length, 1));
      } else if (event.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [images.length, onClose]);

  const activeImage = images[activeIndex];
  const changeImage = (direction: -1 | 1) => {
    setActiveIndex((index) => (index + direction + images.length) % images.length);
  };

  return (
    <div
      className="gallery-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="gallery-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="gallery-title"
        tabIndex={-1}
      >
        <div className="gallery-header">
          <div>
            <p className="gallery-kicker">NASA IMAGE AND VIDEO LIBRARY</p>
            <h2 id="gallery-title">{title}</h2>
          </div>
          <button
            ref={closeButtonRef}
            className="gallery-close"
            type="button"
            onClick={onClose}
            aria-label="Close image gallery"
          >
            <X size={20} />
          </button>
        </div>

        {!activeImage && (
          <div className="gallery-state gallery-error" role="alert">
            <p>No NASA images are available for this topic.</p>
          </div>
        )}

        {activeImage && (
          <>
            <div className="gallery-image-wrap">
              {failedImageId === activeImage.nasaId ? (
                <div className="gallery-state gallery-error" role="alert">
                  <p>This NASA image could not be loaded.</p>
                </div>
              ) : (
                <img
                  key={activeImage.nasaId}
                  src={activeImage.imageUrl}
                  alt={activeImage.alt}
                  className="gallery-image"
                  onError={() => setFailedImageId(activeImage.nasaId)}
                />
              )}
              <div className="gallery-image-count" aria-live="polite">
                {activeIndex + 1} / {images.length}
              </div>
              <button
                className="gallery-arrow gallery-previous"
                type="button"
                onClick={() => changeImage(-1)}
                aria-label="Previous image"
                disabled={images.length < 2}
              >
                <ArrowLeft size={20} />
              </button>
              <button
                className="gallery-arrow gallery-next"
                type="button"
                onClick={() => changeImage(1)}
                aria-label="Next image"
                disabled={images.length < 2}
              >
                <ArrowRight size={20} />
              </button>
            </div>
            <div className="gallery-caption">
              <div>
                <h3>{activeImage.title}</h3>
                {activeImage.date && <p className="gallery-date">{activeImage.date}</p>}
                <p className="gallery-description">{activeImage.description}</p>
                <p className="gallery-credit">Image credit: {activeImage.credit} / NASA</p>
              </div>
              <a
                href={activeImage.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="gallery-source-link"
              >
                NASA image <ExternalLink size={14} />
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
