/**
 * The instruction video.
 *
 * Reserved as a real, sized region rather than a box that appears later, so the
 * page does not reflow around it when the file lands. The aspect ratio is fixed
 * for the same reason: a video that changes the height of the page after load
 * pushes the SOS control out from under someone's thumb.
 *
 * Pass `src` for a self-hosted file, or `embedUrl` for a provider iframe. With
 * neither, it renders the placeholder and says plainly that the video is not
 * there yet, because a silent empty rectangle reads as a broken page.
 */
export default function VideoSlot({ src, embedUrl, poster, title = 'How City Shield works' }) {
  return (
    <figure className="m-0">
      <div className="surface-raised relative aspect-video w-full overflow-hidden">
        {src ? (
          <video
            className="h-full w-full object-cover"
            controls
            preload="metadata"
            poster={poster}
            /* No autoplay: an emergency page that starts making noise on load is
               hostile, and it competes with a screen reader mid-sentence. */
          >
            <source src={src} />
            Your browser cannot play this video.
          </video>
        ) : embedUrl ? (
          <iframe
            className="h-full w-full border-0"
            src={embedUrl}
            title={title}
            loading="lazy"
            allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center">
            <span className="font-data text-micro uppercase tracking-[0.14em] text-ink-3">
              Instruction video
            </span>
            <p className="max-w-sm text-small text-ink-2">
              A 90-second walkthrough of raising an incident and tracking a response will sit
              here. Not yet recorded.
            </p>
          </div>
        )}
      </div>
      <figcaption className="mt-3 text-small text-ink-3">
        {title}. Captions and a transcript will ship with the video, not after it.
      </figcaption>
    </figure>
  );
}
