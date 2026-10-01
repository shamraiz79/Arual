/* Collection filters progressively enhance real links and server-rendered cards. */
(() => {
  const initialize = (root = document) => {
    root.querySelectorAll('[data-au-collections]').forEach(section => {
      if (section.dataset.initialized) return;
      section.dataset.initialized = 'true';
      const grid = section.querySelector('.au-collection-grid');
      const cards = [...section.querySelectorAll('[data-collection-card]')];
      const filters = [...section.querySelectorAll('[data-collection-filter]')];
      const sort = section.querySelector('[data-collection-sort]');
      const status = section.querySelector('[data-collection-status]');
      const collator = new Intl.Collator(document.documentElement.lang || undefined, { numeric: true, sensitivity: 'base' });
      let active = 'all';
      const update = () => {
        const mode = sort?.value || 'featured';
        const ordered = [...cards].sort((a, b) => {
          if (mode === 'az') return collator.compare(a.dataset.title, b.dataset.title);
          if (mode === 'za') return collator.compare(b.dataset.title, a.dataset.title);
          if (mode === 'newest') return (Number(b.dataset.date) || 0) - (Number(a.dataset.date) || 0) || Number(a.dataset.index) - Number(b.dataset.index);
          return Number(a.dataset.index) - Number(b.dataset.index);
        });
        let visible = 0;
        ordered.forEach(card => {
          card.hidden = active !== 'all' && card.dataset.key !== active;
          if (!card.hidden) visible++;
          grid.append(card);
        });
        filters.forEach(button => {
          const selected = button.dataset.collectionFilter === active;
          button.classList.toggle('is-active', selected);
          button.setAttribute('aria-pressed', String(selected));
        });
        status.textContent = `${visible} ${visible === 1 ? 'collection' : 'collections'} shown`;
      };
      filters.forEach(button => button.addEventListener('click', () => { active = button.dataset.collectionFilter; update(); }));
      sort?.addEventListener('change', update);
      section.addEventListener('shopify:block:select', event => {
        if (!event.target.closest('[data-collection-card]')) return;
        active = 'all';
        update();
        event.target.scrollIntoView({ block: 'nearest' });
      });
      section.querySelector('[data-collection-controls]')?.removeAttribute('hidden');
      update();
    });
  };
  initialize();
  document.addEventListener('shopify:section:load', event => initialize(event.target));
})();
