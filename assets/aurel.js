/* Progressive enhancements; shopping and signup work without JavaScript. */
(() => {
  const initialize = (root = document) => {
    root.querySelectorAll('.au-header').forEach((header) => {
      if (header.dataset.initialized) return;
      header.dataset.initialized = 'true';
      const button = header.querySelector('.au-menu-toggle');
      const menu = header.querySelector('.au-mobile-nav');
      const setOpen = (open) => {
        button.setAttribute('aria-expanded', String(open));
        button.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        menu.hidden = !open;
      };
      button.addEventListener('click', () => setOpen(menu.hidden));
      menu.addEventListener('click', (event) => {
        if (event.target.closest('a')) setOpen(false);
      });
      header.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !menu.hidden) {
          setOpen(false);
          button.focus();
        }
      });
      document.addEventListener('click', (event) => {
        if (header.isConnected && !header.contains(event.target)) setOpen(false);
      });
      const desktop = window.matchMedia('(min-width: 750px)');
      desktop.addEventListener('change', () => { if (desktop.matches) setOpen(false); });
    });
    root.querySelectorAll('[data-au-testimonials]').forEach((section) => {
      if (section.dataset.initialized) return;
      section.dataset.initialized = 'true';
      const quotes = [...section.querySelectorAll('[data-au-quote]')];
      let active = 0;
      const show = (index) => {
        if (!quotes.length) return;
        active = (index + quotes.length) % quotes.length;
        quotes.forEach((quote, i) => { quote.hidden = i !== active; });
        section.querySelector('[data-au-slide]').textContent = String(active + 1).padStart(2, '0');
      };
      section.querySelector('.au-quote-prev')?.addEventListener('click', () => show(active - 1));
      section.querySelector('.au-quote-next')?.addEventListener('click', () => show(active + 1));
      section.addEventListener('shopify:block:select', (event) => {
        const index = quotes.indexOf(event.target.closest('[data-au-quote]'));
        if (index >= 0) show(index);
      });
    });
  };
  initialize();
  document.addEventListener('shopify:section:load', (event) => initialize(event.target));
})();
