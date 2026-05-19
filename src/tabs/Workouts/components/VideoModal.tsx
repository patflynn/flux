interface Props {
  videoId: string;
  start?: number;
  onClose: () => void;
}

export function VideoModal({ videoId, start, onClose }: Props) {
  const startParam = start && start > 0 ? `&start=${start}` : '';
  return (
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      data-testid="video-modal"
    >
      <div class="relative aspect-video w-full max-w-3xl overflow-hidden rounded-[2rem] bg-black shadow-flux-card">
        <button
          type="button"
          class="absolute right-3 top-3 z-10 rounded-full bg-flux-card/90 px-4 py-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-flux-text-primary transition-opacity hover:opacity-90"
          onClick={onClose}
        >
          Close
        </button>
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0${startParam}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          class="h-full w-full"
        />
      </div>
    </div>
  );
}
