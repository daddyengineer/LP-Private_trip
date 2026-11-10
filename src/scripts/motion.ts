import lottie, { type AnimationItem } from "lottie-web";
import transitionAnim from "../assets/lottie/transition.json";
import successAnim from "../assets/lottie/success.json";
import thanksAnim from "../assets/lottie/thanks.json";

type MotionWindow = Window & {
  __ptMotion?: boolean;
  playLeadSuccess?: () => Promise<void>;
};

const LEGAL: Record<string, { title: string; body: string }> = {
  cancel: {
    title: "Kebijakan Pembatalan",
    body: "Permintaan di halaman ini belum pembayaran. Kalau rencana berubah sebelum admin mengunci kuota, beri tahu lewat WhatsApp. Setelah harga disetujui, pembatalan mengikuti kesepakatan yang admin kirimkan.",
  },
  privacy: {
    title: "Kebijakan Privasi",
    body: "Nama, nomor WhatsApp, rencana perjalanan, dan catatan dipakai TravelKIF untuk membalas penawaran. Data dicatat di spreadsheet internal dan notifikasi Telegram tim. Data ini tidak dijual.",
  },
  terms: {
    title: "Syarat & Ketentuan",
    body: "Harga final tergantung rute dan tanggal. Tidak ada pembayaran di halaman ini. Bonus voucher dan undangan VIP mengikuti periode November–Desember 2026 dan kuota yang masih ada.",
  },
};

function reducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const SUCCESS_FLAG = "pt-lead-ok";

let active: AnimationItem | null = null;
let thanksPiece: AnimationItem | null = null;
let tick = 0;
let navTimer = 0;

function stage(): { root: HTMLElement; box: HTMLElement } | null {
  const root = document.getElementById("lottie-overlay");
  const box = document.getElementById("lottie-stage");
  if (!root || !box) return null;
  return { root, box };
}

function stop(): void {
  window.clearTimeout(navTimer);
  active?.destroy();
  active = null;
  const nodes = stage();
  if (!nodes) return;
  nodes.root.hidden = true;
  nodes.root.classList.remove("is-success");
}

function show(data: object, loop: boolean, success: boolean): void {
  const nodes = stage();
  if (!nodes || reducedMotion()) return;
  stop();
  nodes.box.replaceChildren();
  nodes.root.classList.toggle("is-success", success);
  nodes.root.hidden = false;
  active = lottie.loadAnimation({
    container: nodes.box,
    renderer: "svg",
    loop,
    autoplay: true,
    animationData: data,
  });
}

function playThanks(): void {
  const box = document.getElementById("thanks-art");
  if (!box || box.dataset.bound === "1") return;
  box.dataset.bound = "1";
  const earned = sessionStorage.getItem(SUCCESS_FLAG) === "1";
  if (earned) sessionStorage.removeItem(SUCCESS_FLAG);
  thanksPiece?.destroy();
  box.replaceChildren();
  const reduce = reducedMotion() || !earned;
  thanksPiece = lottie.loadAnimation({
    container: box,
    renderer: "svg",
    loop: earned && !reducedMotion(),
    autoplay: earned && !reduce,
    animationData: thanksAnim,
  });
  box.dataset.playing = earned && !reduce ? "1" : "0";
  if (reduce) thanksPiece.goToAndStop(0, true);
}

function renderCountdown(): void {
  document.querySelectorAll<HTMLElement>("[data-countdown]").forEach((node) => {
    const ends = Date.parse(node.dataset.ends ?? "");
    const diff = Number.isNaN(ends) ? 0 : Math.max(0, ends - Date.now());
    const total = Math.floor(diff / 1000);
    const parts: Record<string, number> = {
      days: Math.floor(total / 86400),
      hours: Math.floor((total % 86400) / 3600),
      minutes: Math.floor((total % 3600) / 60),
      seconds: total % 60,
    };
    node.querySelectorAll<HTMLElement>("[data-unit]").forEach((unit) => {
      const key = unit.dataset.unit ?? "";
      const value = parts[key] ?? 0;
      unit.textContent = key === "days" ? String(value) : String(value).padStart(2, "0");
    });
  });
}

function openLegal(key: string): void {
  const copy = LEGAL[key];
  const dialog = document.getElementById("legal");
  if (!copy || !(dialog instanceof HTMLDialogElement)) return;
  const title = dialog.querySelector("h2");
  const body = dialog.querySelector("p");
  if (title) title.textContent = copy.title;
  if (body) body.textContent = copy.body;
  dialog.showModal();
}

export function installMotion(): void {
  const host = window as MotionWindow;
  if (host.__ptMotion) return;
  host.__ptMotion = true;

  host.playLeadSuccess = () =>
    new Promise((resolve) => {
      sessionStorage.setItem(SUCCESS_FLAG, "1");
      if (reducedMotion()) {
        resolve();
        return;
      }
      show(successAnim, false, true);
      window.setTimeout(() => {
        stop();
        resolve();
      }, 900);
    });

  document.addEventListener("astro:after-swap", () => {
    if (reducedMotion()) return;
    show(transitionAnim, false, false);
    navTimer = window.setTimeout(stop, 450);
  });

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const opener = target.closest<HTMLElement>("[data-legal]");
    if (opener) {
      event.preventDefault();
      openLegal(opener.dataset.legal ?? "");
    }
    if (target.closest("[data-legal-close]")) {
      document.querySelector("dialog")?.close();
    }
  });

  const boot = () => {
    window.clearInterval(tick);
    renderCountdown();
    playThanks();
    tick = window.setInterval(renderCountdown, 1000);
  };
  boot();
  document.addEventListener("astro:page-load", boot);
}
