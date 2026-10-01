/* Horizon emits before a cart request finishes; redirect only after confirmed success. */
import { StandardEvents } from '@shopify/events';
document.addEventListener(StandardEvents.cartLinesUpdate, event => {
  if (event.action !== 'add' || document.querySelector('[data-au-cart]')) return;
  event.promise?.then(({ detail }) => {
    const destination = document.body.dataset.auCartDestination;
    if (destination && detail?.didError === false) location.assign(destination);
  }).catch(() => {});
});
