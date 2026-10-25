/**
 * Cookie consent + consent-gated analytics.
 * Analytics scripts (GA4) only load after the visitor explicitly accepts and a
 * GA_MEASUREMENT_ID is configured at build time.
 */
const CONSENT_KEY = "grido1:consent";
const GA_ID = import.meta.env.GA_MEASUREMENT_ID || "";

type Consent = "granted" | "denied" | null;

function read(): Consent {
  const value = localStorage.getItem(CONSENT_KEY);
  return value === "granted" || value === "denied" ? value : null;
}

function injectGA(): void {
  if (!GA_ID || document.getElementById("ga4-script")) return;
  const script = document.createElement("script");
  script.id = "ga4-script";
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
  document.head.append(script);
  const config = document.createElement("script");
  config.textContent = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}',{anonymize_ip:true});`;
  document.head.append(config);
}

export function initConsent(): void {
  const banner = document.querySelector<HTMLElement>("#cookie-banner");
  const accept = document.querySelector<HTMLButtonElement>("#cookie-accept");
  const decline = document.querySelector<HTMLButtonElement>("#cookie-decline");
  if (!banner || !accept || !decline) return;

  const existing = read();
  if (existing === "granted") injectGA();
  if (!existing) banner.hidden = false;

  accept.addEventListener("click", () => {
    localStorage.setItem(CONSENT_KEY, "granted");
    banner.hidden = true;
    injectGA();
  });
  decline.addEventListener("click", () => {
    localStorage.setItem(CONSENT_KEY, "denied");
    banner.hidden = true;
  });
}
