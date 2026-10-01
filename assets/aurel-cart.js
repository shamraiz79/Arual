/* Shopify remains the source of truth for prices, discounts, stock and line keys. */
(() => {
  let busy = false;
  const root = () => document.querySelector('[data-au-cart]');
  const enhance = () => {
    const cart = root();
    if (!cart) return;
    cart.querySelectorAll('[data-quantity-step],[data-cart-clear]').forEach(el => el.hidden = false);
    cart.querySelector('[data-cart-update]')?.setAttribute('hidden', '');
  };
  const message = (text, reload = false) => {
    const output = root()?.querySelector('[data-cart-message]');
    if (!output) return;
    output.textContent = text;
    if (reload) {
      const link = document.createElement('a'); link.href = root().dataset.cartUrl; link.textContent = ' Reload cart'; output.append(link);
    }
  };
  const setBusy = value => {
    busy = value;
    root()?.setAttribute('aria-busy', String(value));
    document.querySelectorAll('[data-au-cart] button,[data-au-cart] input,.au-cart-add-form button').forEach(el => {
      if (value) { el.dataset.wasDisabled = String(el.disabled); el.disabled = true; }
      else if ('wasDisabled' in el.dataset) { el.disabled = el.dataset.wasDisabled === 'true'; delete el.dataset.wasDisabled; }
    });
  };
  const refresh = async (result, id, url, focus) => {
    let html = result.sections?.[id];
    if (!html) {
      const address = new URL(url, location.origin); address.searchParams.set('sections', id);
      const response = await fetch(address, { headers: { Accept: 'application/json' }, cache: 'no-store' });
      if (!response.ok) throw new Error('Could not refresh cart');
      html = (await response.json())[id];
    }
    if (!html) throw new Error('Cart section is unavailable');
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const rendered = doc.querySelector('[data-au-cart]');
    const target = root();
    if (!rendered || !target) throw new Error('Cart section is unavailable');
    target.querySelector('[data-cart-content]').replaceWith(rendered.querySelector('[data-cart-content]'));
    const count = Number(rendered.dataset.itemCount);
    target.dataset.itemCount = String(count);
    document.querySelectorAll('[data-au-cart-count]').forEach(el => { el.textContent = String(count); el.closest('a')?.setAttribute('aria-label', `Shopping bag, ${count} items`); });
    enhance();
    if (focus) {
      const row = [...target.querySelectorAll('[data-cart-row]')].find(el => el.dataset.key === focus.key);
      const control = row?.querySelector(focus.selector) || target.querySelector('h2');
      control?.focus({ preventScroll: true });
    }
  };
  const mutate = async (endpoint, payload, focus, success) => {
    if (busy || root()?.dataset.stale) return;
    const cart = root(); if (!cart) return;
    const id = cart.dataset.sectionId, url = cart.dataset.cartUrl;
    const base = window.Shopify?.routes?.root || url.replace(/cart\/?$/, '');
    let confirmed = false, responseReceived = false;
    setBusy(true); message('Updating your cart…');
    try {
      const response = await fetch(base + 'cart/' + endpoint + '.js', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ ...payload, sections: [id], sections_url: url }) });
      responseReceived = true;
      const result = await response.json();
      if (!response.ok) { const error = new Error(result.description || result.message || 'This update could not be completed.'); error.cartRejected = true; throw error; }
      confirmed = true;
      await refresh(result, id, url, focus);
      message(success || 'Cart updated.');
    } catch (error) {
      if (confirmed || !responseReceived || !error.cartRejected) {
        if (root()) root().dataset.stale = 'true';
        message(confirmed ? 'Your cart was updated, but the display could not refresh.' : 'We could not confirm this update. Check your cart before trying again.', true);
      } else {
        root()?.querySelectorAll('[data-cart-quantity]').forEach(input => { input.value = input.dataset.current; });
        message(error.message);
      }
    } finally {
      if (!root()?.dataset.stale) setBusy(false);
      else { root()?.setAttribute('aria-busy', 'false'); busy = false; }
    }
  };
  const changeQuantity = (row, quantity, selector) => mutate('change', { id: row.dataset.key, quantity }, { key: row.dataset.key, selector }, quantity === 0 ? 'Item removed from your cart.' : 'Cart updated.');
  document.addEventListener('click', event => {
    const control = event.target.closest('[data-quantity-step],[data-cart-remove],[data-cart-clear]');
    if (!control || !control.closest('[data-au-cart]')) return;
    event.preventDefault();
    if (busy || root()?.dataset.stale) return;
    if (control.matches('[data-cart-clear]')) { mutate('clear', {}, { selector: 'h2' }, 'Your cart is now empty.'); return; }
    const row = control.closest('[data-cart-row]');
    if (control.matches('[data-cart-remove]')) { changeQuantity(row, 0, '[data-cart-remove]'); return; }
    const input = row.querySelector('[data-cart-quantity]');
    const step = Number(input.step) || 1, min = Number(input.min) || 1, direction = Number(control.dataset.quantityStep);
    const value = Number(input.value) || min;
    const next = direction < 0 && value <= min ? 0 : value + direction * step;
    if (input.hasAttribute('max') && next > Number(input.max)) { message('The maximum available quantity is ' + input.max + '.'); return; }
    changeQuantity(row, next, `[data-quantity-step="${direction}"]`);
  });
  document.addEventListener('change', event => {
    const input = event.target.closest('[data-cart-quantity]'); if (!input || busy) return;
    const quantity = Number(input.value);
    if (!Number.isInteger(quantity) || quantity < 0 || (quantity !== 0 && !input.checkValidity())) { input.reportValidity(); input.value = input.dataset.current; message('Please enter a valid quantity.'); return; }
    if (quantity !== Number(input.dataset.current)) changeQuantity(input.closest('[data-cart-row]'), quantity, '[data-cart-quantity]');
  });
  document.addEventListener('submit', event => {
    const form = event.target;
    if (form.matches('[data-cart-form]')) {
      if (busy || root()?.dataset.stale) { event.preventDefault(); return; }
      // An Enter key in a quantity field updates that item instead of checking out.
      if (event.submitter?.name !== 'checkout') { event.preventDefault(); const input = form.querySelector('[data-cart-quantity]:focus'); input?.dispatchEvent(new Event('change', { bubbles: true })); }
      return;
    }
    if (!form.matches('.au-cart-add-form')) return;
    event.preventDefault(); if (busy) return;
    const data = new FormData(form);
    mutate('add', { items: [{ id: Number(data.get('id')), quantity: Number(data.get('quantity')) || 1 }] }, null, 'Added to your cart.');
  });
  addEventListener('pageshow', event => { if (event.persisted && root()) location.reload(); });
  document.addEventListener('shopify:section:load', enhance);
  enhance();
})();
