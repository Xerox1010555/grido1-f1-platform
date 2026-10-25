/** Accessible mobile sheet menu: focus trap, Escape close, wide-screen auto-close. */
export function initMobileMenu(): void {
  const menuEl = document.querySelector<HTMLElement>("#mobile-sheet");
  const openEl = document.querySelector<HTMLButtonElement>("#menu-open");
  const closeEl = document.querySelector<HTMLButtonElement>("#menu-close");
  if (!menuEl || !openEl || !closeEl) return;
  const menu = menuEl;
  const menuOpen = openEl;
  const menuClose = closeEl;

  const links = [...menu.querySelectorAll<HTMLElement>(".sheet-links a")];
  let previousFocus: Element | null = null;

  function setMenu(open: boolean): void {
    menu.setAttribute("aria-hidden", String(!open));
    menuOpen.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("menu-open", open);
    if (open) {
      previousFocus = document.activeElement;
      menuClose.focus();
      links.forEach((link, index) => {
        const delay = 120 + index * 55;
        link.style.transition = `opacity 450ms cubic-bezier(.2,0,0,1) ${delay}ms, transform 450ms cubic-bezier(.2,0,0,1) ${delay}ms`;
        link.style.opacity = "1";
        link.style.transform = "translateY(0)";
      });
    } else {
      links.forEach((link) => {
        link.style.opacity = "0";
        link.style.transform = "translateY(.75rem)";
      });
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    }
  }

  menuOpen.addEventListener("click", () => setMenu(true));
  menuClose.addEventListener("click", () => setMenu(false));
  menu.querySelector(".brand")?.addEventListener("click", () => setMenu(false));
  menu.addEventListener("click", (event) => {
    if ((event.target as Element).closest("a")) setMenu(false);
  });

  addEventListener("keydown", (event) => {
    const isOpen = menu.getAttribute("aria-hidden") === "false";
    if (!isOpen) return;
    if (event.key === "Escape") {
      setMenu(false);
      return;
    }
    if (event.key === "Tab") {
      const focusable = [...menu.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  const wideQuery = matchMedia("(min-width: 1280px)");
  wideQuery.addEventListener("change", (event) => {
    if (event.matches) setMenu(false);
  });
}
