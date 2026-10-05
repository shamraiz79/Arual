/* Progressive enhancements; shopping and signup work without JavaScript. */
(() => {
  const initialize = (root = document) => {
    root.querySelectorAll('.au-header').forEach((header) => {
      if (header.dataset.initialized) return;
      header.dataset.initialized = 'true';
      const button = header.querySelector('.au-menu-toggle');
      const menu = header.querySelector('.au-main-nav');
      const backdrop = header.querySelector('.au-menu-backdrop');
      const dropdowns = [...menu.querySelectorAll('details')];
      const desktop = window.matchMedia('(min-width: 990px)');
      const updateBackdrop = () => {
        const headerBottom = header.getBoundingClientRect().bottom;
        backdrop.style.setProperty('--au-backdrop-top', headerBottom + 'px');
        backdrop.hidden = !desktop.matches || !dropdowns.some(item => item.open);
        if (desktop.matches) {
          const hero = document.querySelector('.au-hero');
          const heroBottom = hero?.getBoundingClientRect().bottom;
          const bottom = heroBottom > headerBottom ? Math.min(window.innerHeight, heroBottom) : window.innerHeight;
          header.style.setProperty('--au-mega-height', Math.max(0, (bottom - headerBottom) * .85) + 'px');
        }
      };
      const hoverCapable = window.matchMedia('(hover: hover) and (pointer: fine)');
      let closeTimer;
      const cancelClose = () => window.clearTimeout(closeTimer);
      const closeDropdowns = () => { cancelClose(); dropdowns.forEach(item => { item.open = false; }); updateBackdrop(); };
      dropdowns.forEach(item => {
        item.addEventListener('pointerenter', event => {
          if (!desktop.matches || !hoverCapable.matches || event.pointerType === 'touch') return;
          cancelClose();
          dropdowns.forEach(other => { other.open = other === item; });
          updateBackdrop();
        });
        item.addEventListener('pointerleave', event => {
          if (!desktop.matches || !hoverCapable.matches || event.pointerType === 'touch') return;
          cancelClose();
          // Let the pointer cross the small gap between the label and the panel.
          closeTimer = window.setTimeout(() => { item.open = false; updateBackdrop(); }, 240);
        });
      });
      const setOpen = (open) => {
        button.setAttribute('aria-expanded', String(open));
        button.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        menu.classList.toggle('is-open', open);
        if (!open) closeDropdowns();
      };
      button.addEventListener('click', () => setOpen(button.getAttribute('aria-expanded') !== 'true'));
      dropdowns.forEach(item => item.addEventListener('toggle', () => {
        if (item.open) dropdowns.forEach(other => { if (other !== item) other.open = false; });
        updateBackdrop();
      }));
      menu.addEventListener('click', event => { if (event.target.closest('a')) setOpen(false); });
      const handleKeydown = event => {
        if (event.key !== 'Escape') return;
        const openDropdown = dropdowns.find(item => item.open);
        if (openDropdown) { closeDropdowns(); openDropdown.querySelector('summary').focus(); }
        else if (menu.classList.contains('is-open')) { setOpen(false); button.focus(); }
      };
      header.addEventListener('focusout', () => {
        requestAnimationFrame(() => { if (!header.contains(document.activeElement)) setOpen(false); });
      });
      // Abort global listeners when Shopify replaces this section in the editor.
      const controller = new AbortController();
      const options = { signal: controller.signal };
      document.addEventListener('keydown', handleKeydown, options);
      document.addEventListener('click', event => {
        if (!header.contains(event.target) || event.target === backdrop) setOpen(false);
      }, options);
      const headerResize = new ResizeObserver(updateBackdrop);
      headerResize.observe(header);
      const hero = document.querySelector('.au-hero');
      if (hero) headerResize.observe(hero);
      document.querySelector('.page-wrapper')?.addEventListener('scroll', updateBackdrop, { ...options, passive: true });
      window.addEventListener('resize', updateBackdrop, options);
      window.addEventListener('scroll', updateBackdrop, { ...options, passive: true });
      desktop.addEventListener('change', () => setOpen(false), options);
      document.addEventListener('shopify:section:unload', event => {
        if (event.target.contains(header)) { cancelClose(); headerResize.disconnect(); controller.abort(); }
      }, options);
      header.addEventListener('shopify:block:select', event => {
        const dropdown = event.target.closest('details');
        if (dropdown) { if (!desktop.matches) setOpen(true); dropdown.open = true; }
      });
    });

  };
  initialize();
  document.addEventListener('shopify:section:load', (event) => initialize(event.target));
})();
