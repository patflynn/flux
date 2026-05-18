interface Props {
  videoId: string;
  start?: number;
  onClose: () => void;
}

export function VideoModal({ videoId, start, onClose }: Props) {
  const startParam = start && start > 0 ? `&start=${start}` : '';
  return (
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      data-testid="video-modal"
    >
      <div class="relative aspect-video w-full max-w-3xl overflow-hidden rounded-lg bg-black">
        <button
          type="button"
          class="absolute right-2 top-2 z-10 rounded-full border border-white/30 px-2 py-1 text-xs uppercase tracking-wider text-white hover:bg-white/10"
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
