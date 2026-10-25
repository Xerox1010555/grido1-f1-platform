/** Client runtime for the i18n layer: swaps `data-i18n` strings and toggles RTL. */
import { dict, LANGS, type Lang, type TranslationKey } from "../i18n";
import { splitReveal } from "./reveal";

const STORAGE_KEY = "grido1:lang";

function isLang(value: string | null): value is Lang {
  return LANGS.includes(value as Lang);
}

function currentLang(): Lang {
  const stored = localStorage.getItem(STORAGE_KEY);
  return isLang(stored) ? stored : "en";
}

/** Re-split an animated heading with the translated text (kept in sync with reveal.ts). */
function applyRevealText(el: HTMLElement, value: string): void {
  if (el.dataset.lines === value) return;
  el.dataset.lines = value;
  delete el.dataset.split;
  splitReveal(el);
  // If the reveal already fired, show the new units instantly.
  if (el.classList.contains("is-visible")) {
    el.querySelectorAll<HTMLElement>(".unit").forEach((unit) => {
      unit.style.opacity = "1";
      unit.style.transform = "none";
    });
  }
}

function apply(lang: Lang): void {
  const table = dict[lang] as Record<string, string>;
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";

  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    const value = key ? table[key] : undefined;
    if (value) el.textContent = value;
  });
  // Animated headings (data-reveal) carry their translated text via a
  // newline-separated dictionary value and are re-split in place.
  document.querySelectorAll<HTMLElement>("[data-i18n-reveal]").forEach((el) => {
    const key = el.dataset.i18nReveal;
    const value = key ? table[key] : undefined;
    if (value) applyRevealText(el, value);
  });
  document.querySelectorAll<HTMLElement>("[data-i18n-attr]").forEach((el) => {
    // format: "attr:key,attr:key"
    const pairs = (el.dataset.i18nAttr || "").split(",").filter(Boolean);
    for (const pair of pairs) {
      const [attr, key] = pair.split(":");
      const value = key ? table[key] : undefined;
      if (attr && value) el.setAttribute(attr, value);
    }
  });

  document.querySelectorAll<HTMLButtonElement>(".lang-toggle").forEach((btn) => {
    btn.textContent = lang === "en" ? dict.ar["lang.toggle"] : dict.en["lang.toggle"];
  });

  // Event so page scripts can react (e.g. re-render relative dates).
  window.dispatchEvent(new CustomEvent("grido1:langchange", { detail: { lang } }));
}

export function initI18n(): void {
  document.querySelectorAll<HTMLButtonElement>(".lang-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const next: Lang = currentLang() === "en" ? "ar" : "en";
      localStorage.setItem(STORAGE_KEY, next);
      apply(next);
    });
  });
  apply(currentLang());
}

export { dict, currentLang };
export type { Lang, TranslationKey };
