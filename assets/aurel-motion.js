/* Native motion, scroll-snap sliders and progressive AJAX quick add. */
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const cleanups = new Map();
  const parallax = new Set();
  const observed = new Set();
  const register = (element, cleanup) => cleanups.set(element, cleanup);
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(({ target, isIntersecting }) => {
      if (!isIntersecting) return;
      target.classList.add('au-visible');
      observer.unobserve(target);
      observed.delete(target);
    });
  }, { threshold: .12 }) : null;
  // Content is only hidden once an observer is available. No-JS stays fully visible.
  if (observer) document.documentElement.classList.add('au-motion-ready');
  const reveal = (element, delay = 0, image = false, distance = 25) => {
    if (!element || element.dataset.auReveal) return;
    element.dataset.auReveal = 'true';
    element.classList.add(image ? 'au-image-reveal' : 'au-reveal');
    element.style.setProperty('--au-delay', delay + 'ms');
    element.style.setProperty('--au-reveal-distance', distance + 'px');
    if (!observer || reduced.matches || window.Shopify?.designMode) element.classList.add('au-visible');
    else { observed.add(element); observer.observe(element); }
  };
  const children = (root, selector, distance = 25) => root.querySelectorAll(selector).forEach(parent => {
    [...parent.children].filter(el => !el.matches('.au-seal,.au-rule:empty[hidden]')).forEach((el, i) => reveal(el, Math.min(i * 100, 400), false, distance));
  });
  function initialize(root = document) {
    root.querySelectorAll('.au-announcement').forEach(bar => {
      if (bar.dataset.auMarquee) return;
      bar.dataset.auMarquee = 'true';
      const windowEl = bar.firstElementChild;
      if (!windowEl) return;
      const copy = document.createElement('span'); copy.className = 'au-announcement-copy'; copy.textContent = windowEl.textContent;
      const duplicate = copy.cloneNode(true); duplicate.setAttribute('aria-hidden', 'true');
      const track = document.createElement('span'); track.className = 'au-announcement-track'; track.append(copy, duplicate);
      windowEl.classList.add('au-announcement-window'); windowEl.replaceChildren(track);
    });
    root.querySelectorAll('.au-header').forEach(header => {
      if (header.dataset.auSticky) return;
      header.dataset.auSticky = 'true';
      const group = header.closest('#header-group') || header.closest('.shopify-section');
      group?.classList.add('au-sticky-group');
      const announcement = group?.querySelector('.au-announcement');
      const resize = new ResizeObserver(() => group?.style.setProperty('--au-announcement-height', (announcement?.offsetHeight || 0) + 'px'));
      if (announcement) resize.observe(announcement);
      register(header, () => resize.disconnect());
    });
    children(root, '.au-hero-content');
    root.querySelectorAll('.au-benefit').forEach((el, i) => reveal(el, (i % 4) * 100, false, 15));
    root.querySelectorAll('.au-grid-intro,.au-seasonal-content,.au-seasonal-side>div,.au-community-copy>h2').forEach(el => reveal(el));
    root.querySelectorAll('.au-grid-section--categories .au-card,.au-directory-card').forEach((el, i) => reveal(el, (i % 4) * 100, false, 15));
    children(root, '.au-newsletter,.au-story-banner__copy,.au-story-editorial__copy,.au-collections-banner__copy');
    root.querySelectorAll('.au-story-line').forEach((el, i) => reveal(el, i * 100));
    root.querySelectorAll('.au-story-content>.au-eyebrow,.au-story-content>p:not(.au-eyebrow),.au-story-content>.au-button').forEach(el => reveal(el, 150));
    // Keep story photographs visible without waiting for a scroll reveal.
    root.querySelectorAll('.au-seasonal-main>.au-image').forEach(el => reveal(el, 0, true));
    root.querySelectorAll('.au-story-highlight').forEach((el, i) => reveal(el, (i % 4) * 100, false, 15));
    root.querySelectorAll('.au-story,.au-seal:not(.au-seal--still)').forEach(el => parallax.add(el));
    root.querySelectorAll('[data-au-track]').forEach(track => {
      if (track.dataset.auSlider) return;
      track.dataset.auSlider = 'true';
      const section = track.closest('.au-grid-section');
      const controls = section.querySelector('[data-au-slider-controls]');
      if (!controls) return;
      const prev = controls.querySelector('[data-au-prev]'), next = controls.querySelector('[data-au-next]');
      const update = () => {
        const max = track.scrollWidth - track.clientWidth;
        controls.hidden = max < 4;
        prev.disabled = track.scrollLeft < 3;
        next.disabled = track.scrollLeft >= max - 3;
      };
      const move = direction => {
        const first = track.firstElementChild;
        const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
        track.scrollBy({ left: direction * ((first?.getBoundingClientRect().width || track.clientWidth) + gap), behavior: reduced.matches ? 'instant' : 'smooth' });
      };
      prev.addEventListener('click', () => move(-1)); next.addEventListener('click', () => move(1));
      const onScroll = () => update(); track.addEventListener('scroll', onScroll, { passive: true });
      track.addEventListener('keydown', event => {
        if (event.target !== track || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
        event.preventDefault(); move(event.key === 'ArrowLeft' ? -1 : 1);
      });
      const resize = new ResizeObserver(update); resize.observe(track); update();
      register(track, () => { resize.disconnect(); track.removeEventListener('scroll', onScroll); });
    });
    root.querySelectorAll('[data-au-testimonials]').forEach(section => {
      if (section.dataset.auQuotes) return;
      section.dataset.auQuotes = 'true';
      const quotes = [...section.querySelectorAll('[data-au-quote]')];
      const viewport = section.querySelector('.au-quotes');
      const pause = section.querySelector('[data-au-quote-pause]');
      if (!quotes.length) return;
      let active = 0, timer, visible = false, hovering = false, focused = false;
      let paused = section.dataset.autoplay !== 'true' || reduced.matches;
      const delay = Math.max(5000, Number(section.dataset.interval) || 6000);
      const stop = () => { clearTimeout(timer); timer = undefined; };
      const sync = () => {
        stop();
        if (pause) { pause.hidden = quotes.length < 2 || reduced.matches; pause.textContent = paused || reduced.matches ? 'Play slideshow' : 'Pause slideshow'; }
        viewport.setAttribute('aria-live', paused || reduced.matches ? 'polite' : 'off');
        if (!paused && !reduced.matches && visible && !hovering && !focused && !document.hidden && quotes.length > 1 && !window.Shopify?.designMode) timer = setTimeout(() => show(active + 1), delay);
      };
      const show = (index, manual = false) => {
        const direction = index < active ? -1 : 1;
        active = (index + quotes.length) % quotes.length;
        if (manual) paused = true;
        quotes.forEach((quote, i) => { quote.getAnimations().forEach(animation => animation.cancel()); quote.hidden = i !== active; });
        section.querySelector('[data-au-slide]').textContent = String(active + 1).padStart(2, '0');
        if (!reduced.matches) quotes[active].animate([{ opacity: 0, transform: `translateX(${direction * 18}px)` }, { opacity: 1, transform: 'translateX(0)' }], { duration: 650, easing: 'ease-out' });
        sync();
      };
      const measure = () => {
        quotes.forEach(quote => { quote.hidden = false; quote.style.gridArea = '1 / 1'; });
        viewport.style.display = 'grid';
        viewport.style.minHeight = Math.max(...quotes.map(q => q.getBoundingClientRect().height), 126) + 'px';
        quotes.forEach((quote, i) => { quote.hidden = i !== active; });
      };
      let previousWidth = 0;
      const resize = new ResizeObserver(entries => { const width = entries[0].contentRect.width; if (Math.abs(width - previousWidth) > 1) { previousWidth = width; measure(); } });
      resize.observe(viewport);
      section.querySelector('.au-quote-prev')?.addEventListener('click', () => show(active - 1, true));
      section.querySelector('.au-quote-next')?.addEventListener('click', () => show(active + 1, true));
      pause?.addEventListener('click', () => { paused = !paused; sync(); });
      section.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') { hovering = true; sync(); } });
      section.addEventListener('pointerleave', () => { hovering = false; sync(); });
      section.addEventListener('focusin', () => { focused = true; sync(); });
      section.addEventListener('focusout', () => { requestAnimationFrame(() => { focused = section.contains(document.activeElement); sync(); }); });
      let touchStart;
      viewport.addEventListener('pointerdown', event => { if (event.pointerType === 'touch') touchStart = { x: event.clientX, y: event.clientY }; });
      viewport.addEventListener('pointerup', event => {
        if (!touchStart) return;
        const dx = event.clientX - touchStart.x, dy = event.clientY - touchStart.y; touchStart = null;
        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) show(active + (dx < 0 ? 1 : -1), true);
      });
      viewport.addEventListener('pointercancel', () => { touchStart = null; });
      section.addEventListener('shopify:block:select', event => { const i = quotes.indexOf(event.target.closest('[data-au-quote]')); if (i >= 0) show(i, true); });
      const intersection = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }, { threshold: .3 }); intersection.observe(section);
      const onPreference = () => { if (reduced.matches) { paused = true; quotes.forEach(q => q.getAnimations().forEach(a => a.cancel())); } sync(); };
      document.addEventListener('visibilitychange', sync); reduced.addEventListener('change', onPreference);
      sync(); measure();
      register(section, () => { stop(); resize.disconnect(); intersection.disconnect(); document.removeEventListener('visibilitychange', sync); reduced.removeEventListener('change', onPreference); });
    });
    schedule();
  }
  const scrollPosition = () => innerWidth >= 990 && document.querySelector('.page-wrapper') ? document.querySelector('.page-wrapper').scrollTop : scrollY;
  let frame, lastScroll = scrollPosition(), headerLock = 0;
  function updateScroll() {
    frame = null;
    const y = scrollPosition(), delta = y - lastScroll;
    if (Math.abs(delta) > 5 && performance.now() > headerLock) {
      document.querySelectorAll('.au-header').forEach(header => {
        const compact = y > 90 && delta > 0;
        if (header.classList.contains('au-header--compact') !== compact) { header.classList.toggle('au-header--compact', compact); headerLock = performance.now() + 300; }
      });
    }
    if (Math.abs(delta) > 5) lastScroll = y;
    if (y <= 90) document.querySelectorAll('.au-header--compact').forEach(header => header.classList.remove('au-header--compact'));
    parallax.forEach(el => {
      if (!el.isConnected) { parallax.delete(el); return; }
      const rect = (el.closest('.au-hero') || el).getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > innerHeight) return;
      const progress = Math.min(1, Math.max(0, (innerHeight - rect.top) / (innerHeight + rect.height)));
      if (el.matches('.au-seal')) el.style.setProperty('--au-seal-offset', reduced.matches ? '0px' : (progress * 8).toFixed(2) + 'px');
      else el.style.setProperty('--au-photo-offset', reduced.matches ? '0px' : (-progress * 30).toFixed(2) + 'px');
    });
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(updateScroll); }
  addEventListener('scroll', schedule, { passive: true }); document.querySelector('.page-wrapper')?.addEventListener('scroll', schedule, { passive: true }); addEventListener('resize', schedule);
  reduced.addEventListener('change', () => { if (reduced.matches) observed.forEach(el => { el.classList.add('au-visible'); observer?.unobserve(el); }); schedule(); });
  document.addEventListener('focusin', event => { const revealEl = event.target.closest('.au-reveal'); if (revealEl) revealEl.classList.add('au-visible'); });
  // Queue mutations so two quick adds cannot produce stale cart-count responses.
  let cartQueue = Promise.resolve();
  document.addEventListener('submit', event => {
    const form = event.target.closest('.au-product-form');
    if (!form) return;
    event.preventDefault();
    if (form.dataset.pending) return;
    const button = form.querySelector('button[type=submit]');
    const status = form.closest('.au-grid-section').querySelector('[data-au-cart-feedback]');
    const data = new FormData(form);
    const base = window.Shopify?.routes?.root || '/';
    form.dataset.pending = 'true'; button.disabled = true; button.setAttribute('aria-busy', 'true');
    if (status) status.textContent = 'Adding to cart…';
    cartQueue = cartQueue.catch(() => {}).then(async () => {
      let added = false;
      try {
        const response = await fetch(base + 'cart/add.js', { method: 'POST', body: data, headers: { Accept: 'application/json' } });
        const result = await response.json();
        if (!response.ok) throw new Error(result.description || result.message || 'This item could not be added. Please try again.');
        added = true;
        if (document.body.dataset.auCartDestination && !document.querySelector('[data-au-cart]')) { location.assign(document.body.dataset.auCartDestination); return; }
        if (status) status.textContent = 'Added to cart';
        const cartResponse = await fetch(base + 'cart.js', { headers: { Accept: 'application/json' }, cache: 'no-store' });
        if (!cartResponse.ok) throw new Error('Cart refresh failed');
        const cart = await cartResponse.json();
        document.querySelectorAll('[data-au-cart-count]').forEach(el => { el.textContent = String(cart.item_count); el.closest('a')?.setAttribute('aria-label', `Shopping bag, ${cart.item_count} items`); });
        document.dispatchEvent(new CustomEvent('aurel:cart-updated', { detail: { cart } }));
      } catch (error) {
        if (status) status.textContent = added ? 'Added to cart. Open your bag to see the updated total.' : (error.message === 'Failed to fetch' ? 'Could not confirm the update. Check your bag before trying again.' : error.message);
      } finally { delete form.dataset.pending; button.disabled = false; button.removeAttribute('aria-busy'); }
    });
  });
  initialize();
  document.addEventListener('shopify:section:load', event => initialize(event.target));
  document.addEventListener('shopify:section:unload', event => {
    cleanups.forEach((cleanup, element) => { if (event.target.contains(element)) { cleanup(); cleanups.delete(element); } });
    observed.forEach(element => { if (event.target.contains(element)) { observer?.unobserve(element); observed.delete(element); } });
    parallax.forEach(element => { if (event.target.contains(element)) parallax.delete(element); });
  });
})();
