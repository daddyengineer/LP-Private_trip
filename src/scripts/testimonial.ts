function stage(): HTMLElement | null {
  return document.querySelector<HTMLElement>("[data-testimonial]");
}

async function play(video: HTMLVideoElement): Promise<void> {
  if (!video.currentSrc && !video.src && video.querySelector("source") === null) return;
  try {
    await video.play();
    video.closest(".testi-stage")?.classList.add("is-playing");
  } catch {
    video.closest(".testi-stage")?.classList.remove("is-playing");
  }
}

export function bindTestimonial(): void {
  const root = stage();
  const video = root?.querySelector("video");
  if (!root || !video || root.dataset.bound === "true") return;
  root.dataset.bound = "true";

  root.addEventListener("click", () => {
    video.muted = false;
    void play(video);
  });

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) continue;
        video.muted = true;
        void play(video);
      }
    },
    { threshold: 0.6 },
  );
  observer.observe(root);
}
