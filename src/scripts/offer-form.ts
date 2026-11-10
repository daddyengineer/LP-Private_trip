type Draft = {
  destination: string;
  date: string;
  time: string;
  passengers: number;
  luggage: number;
  driver: boolean;
  name: string;
  whatsapp: string;
  notes: string;
  consent: boolean;
};

const DRAFT_KEY = "pt-offer-draft";

function readPromo(): { code: string; utm: string } {
  const params = new URLSearchParams(window.location.search);
  const code =
    ["promo", "kode_promo", "utm_content"]
      .map((key) => params.get(key)?.trim() ?? "")
      .find((value) => /^[A-Za-z0-9_-]{2,40}$/.test(value)) ?? "";
  const utm = [...params.entries()]
    .filter(([key]) => key.toLowerCase().startsWith("utm_"))
    .map(([key, value]) => `${key}=${value}`)
    .join("&")
    .slice(0, 500);
  return { code, utm };
}

function normalizeLocal(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("62")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits;
}

function validPhone(value: string): boolean {
  return /^8\d{7,12}$/.test(normalizeLocal(value));
}

function prettyDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function loadDraft(): Partial<Draft> | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Partial<Draft>) : null;
  } catch {
    return null;
  }
}

export function installOfferForm(): void {
  const form = document.querySelector<HTMLFormElement>("#offer");
  if (!form || form.dataset.ready === "1") return;
  form.dataset.ready = "1";

  const destination = form.querySelector<HTMLInputElement>("#destination");
  const date = form.querySelector<HTMLInputElement>("#depart-date");
  const time = form.querySelector<HTMLInputElement>("#depart-time");
  const passengers = form.querySelector<HTMLOutputElement>("#passengers");
  const luggage = form.querySelector<HTMLOutputElement>("#luggage");
  const driver = form.querySelector<HTMLInputElement>("#driver");
  const name = form.querySelector<HTMLInputElement>("#full-name");
  const whatsapp = form.querySelector<HTMLInputElement>("#whatsapp");
  const notes = form.querySelector<HTMLTextAreaElement>("#notes");
  const consent = form.querySelector<HTMLInputElement>("#consent");
  const company = form.querySelector<HTMLInputElement>("#company");
  const error = form.querySelector<HTMLElement>("#form-error");
  const hint = form.querySelector<HTMLElement>("#wa-hint");
  const phoneBox = form.querySelector<HTMLElement>("#phone-box");
  const promoNote = document.querySelector<HTMLElement>("#promo-note");
  const promoBar = document.querySelector<HTMLElement>("[data-promo]");
  const back = document.querySelector<HTMLAnchorElement>("#form-back");
  if (
    !destination ||
    !date ||
    !time ||
    !passengers ||
    !luggage ||
    !driver ||
    !name ||
    !whatsapp ||
    !notes ||
    !consent ||
    !company
  ) {
    return;
  }

  const promo = readPromo();
  if (promoNote) {
    promoNote.textContent = promo.code
      ? `🏷️ Kode promo ${promo.code} otomatis terpasang dari link iklan`
      : "🏷️ Kode promo terpasang otomatis kalau kamu membuka link iklan";
  }

  const draft = loadDraft();
  if (draft) {
    destination.value = draft.destination ?? "";
    date.value = draft.date ?? "";
    time.value = draft.time ?? "";
    passengers.value = String(draft.passengers ?? 1);
    luggage.value = String(draft.luggage ?? 0);
    driver.checked = Boolean(draft.driver);
    name.value = draft.name ?? "";
    whatsapp.value = draft.whatsapp ?? "";
    notes.value = draft.notes ?? "";
    consent.checked = Boolean(draft.consent);
  }

  let step = 1;

  const showError = (message: string) => {
    if (!error) return;
    error.hidden = !message;
    error.textContent = message;
  };

  const persist = () => {
    const next: Draft = {
      destination: destination.value,
      date: date.value,
      time: time.value,
      passengers: Number(passengers.value),
      luggage: Number(luggage.value),
      driver: driver.checked,
      name: name.value,
      whatsapp: whatsapp.value,
      notes: notes.value,
      consent: consent.checked,
    };
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(next));
  };

  const paintPhone = () => {
    const ok = whatsapp.value.trim() !== "" && validPhone(whatsapp.value);
    phoneBox?.classList.toggle("valid", ok);
    phoneBox?.classList.toggle("invalid", whatsapp.value.trim() !== "" && !ok);
    if (hint) hint.hidden = !ok;
  };

  const showStep = (next: number, scroll = true) => {
    step = next;
    form.querySelectorAll<HTMLElement>("[data-step]").forEach((panel) => {
      panel.hidden = Number(panel.dataset.step) !== next;
    });
    promoBar?.classList.toggle("is-compact", next > 1);
    if (back) back.href = next === 1 ? `/${window.location.search}` : "#step";
    if (next === 3) fillSummary();
    showError("");
    if (scroll) window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const fillSummary = () => {
    const set = (id: string, value: string) => {
      const node = document.getElementById(id);
      if (node) node.textContent = value;
    };
    const local = normalizeLocal(whatsapp.value);
    const spaced = local.replace(/^(\d{3})(\d{4})(\d+)$/, "$1 $2 $3");
    set("sum-destination", destination.value.trim());
    set("sum-date", `${prettyDate(date.value)} · ${time.value}`);
    set("sum-party", `${passengers.value} orang · ${luggage.value} koper`);
    set("sum-contact", `${name.value.trim()} · +62 ${spaced}`);
    set("sum-notes", notes.value.trim() || "—");
    set("sum-driver", driver.checked ? "Ya" : "Tidak");
  };

  const bump = (output: HTMLOutputElement, delta: number, min: number) => {
    const next = Math.min(20, Math.max(min, Number(output.value) + delta));
    output.value = String(next);
    persist();
  };

  form.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const stepButton = target.closest<HTMLElement>("[data-goto]");
    if (stepButton) {
      const goto = Number(stepButton.dataset.goto);
      if (goto > step && !validate(step)) return;
      showStep(goto);
      return;
    }
    const plus = target.closest<HTMLElement>("[data-plus]");
    const minus = target.closest<HTMLElement>("[data-minus]");
    if (plus?.dataset.plus === "passengers" || minus?.dataset.minus === "passengers") {
      bump(passengers, plus ? 1 : -1, 1);
    }
    if (plus?.dataset.plus === "luggage" || minus?.dataset.minus === "luggage") {
      bump(luggage, plus ? 1 : -1, 0);
    }
  });

  back?.addEventListener("click", (event) => {
    if (step === 1) return;
    event.preventDefault();
    showStep(step - 1);
  });

  form.addEventListener("input", () => {
    paintPhone();
    persist();
  });

  const validate = (which: number): boolean => {
    if (which === 1) {
      if (destination.value.trim().length < 2) {
        showError("Isi destinasi perjalanan.");
        destination.focus();
        return false;
      }
      if (!date.value || !time.value) {
        showError("Isi tanggal dan jam keberangkatan.");
        (date.value ? time : date).focus();
        return false;
      }
      if (Number(passengers.value) < 1) {
        showError("Jumlah penumpang wajib diisi.");
        return false;
      }
    }
    if (which === 2) {
      if (name.value.trim().length < 2) {
        showError("Isi nama lengkap.");
        name.focus();
        return false;
      }
      if (!validPhone(whatsapp.value)) {
        showError("Nomor WhatsApp belum valid.");
        whatsapp.focus();
        return false;
      }
      if (!consent.checked) {
        showError("Setujui penggunaan data untuk dihubungi.");
        consent.focus();
        return false;
      }
    }
    showError("");
    return true;
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!validate(1) || !validate(2)) {
      showStep(!destination.value || !date.value || !time.value ? 1 : 2);
      return;
    }
    const submit = form.querySelector<HTMLButtonElement>("#send");
    if (submit) submit.disabled = true;
    showError("");
    const local = normalizeLocal(whatsapp.value);
    try {
      const response = await fetch("/api/lead", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          service: "Private Trip",
          destination: destination.value.trim(),
          date: date.value,
          time: time.value,
          passengers: Number(passengers.value),
          luggage: Number(luggage.value),
          indonesianDriver: driver.checked,
          name: name.value.trim(),
          whatsapp: local,
          notes: notes.value.trim(),
          promoCode: promo.code,
          utm: promo.utm,
          page: "/penawaran",
          consent: true,
          company: company.value,
        }),
      });
      const body = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!response.ok || !body?.ok) {
        showError(body?.error || "Penawaran belum terkirim. Coba lagi sebentar.");
        if (submit) submit.disabled = false;
        return;
      }
      sessionStorage.removeItem(DRAFT_KEY);
      await window.playLeadSuccess?.();
      const thanks = document.querySelector<HTMLAnchorElement>("#thanks-link");
      if (thanks) thanks.click();
      else window.location.assign("/terima-kasih");
    } catch {
      showError("Penawaran belum terkirim. Coba lagi sebentar.");
      if (submit) submit.disabled = false;
    }
  });

  paintPhone();
  showStep(1, false);
}
