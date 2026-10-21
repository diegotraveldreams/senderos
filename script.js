const heroVideo = document.querySelector('.hero-photo video');
if (heroVideo) {
  const tryPlay = () => heroVideo.play().catch(() => {});
  tryPlay();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tryPlay(); });
  ['touchstart', 'click', 'scroll'].forEach(evt => {
    document.addEventListener(evt, tryPlay, { once: true, passive: true });
  });
}

const menuToggle = document.getElementById('menuToggle');
const navLinks = document.getElementById('navLinks');
if (menuToggle && navLinks) {
  menuToggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', isOpen);
    menuToggle.textContent = isOpen ? '✕' : '☰';
  });
}
document.querySelectorAll('.menu-exp-tabs').forEach(tabs => {
  const menuExp = tabs.closest('.menu-exp');
  const track = menuExp ? menuExp.querySelector('.menu-exp-track') : null;
  if (!track) return;
  const bgImg = menuExp.querySelector('.menu-exp-bg img');

  const filterOf = el => el.dataset.filter || (el.dataset.categories || '').split(' ')[0];

  // Loop a strip: clone its original set once before and once after it, so
  // swiping past either end lands on identical items instead of a hard stop.
  function loopify(container) {
    const originals = Array.from(container.children);
    const setSize = originals.length;
    const makeCloneSet = () => originals.map(el => {
      const clone = el.cloneNode(true);
      clone.classList.remove('active', 'is-active');
      clone.setAttribute('aria-hidden', 'true');
      clone.tabIndex = -1;
      return clone;
    });
    const beforeFrag = document.createDocumentFragment();
    makeCloneSet().forEach(el => beforeFrag.appendChild(el));
    container.insertBefore(beforeFrag, container.firstChild);
    const afterFrag = document.createDocumentFragment();
    makeCloneSet().forEach(el => afterFrag.appendChild(el));
    container.appendChild(afterFrag);
    return { items: Array.from(container.children), setSize };
  }

  const { items: cards, setSize: cardSetSize } = loopify(track);
  const { items: pills, setSize: pillSetSize } = loopify(tabs);

  function centerIn(container, el, smooth) {
    if (!el) return;
    const target = el.offsetLeft - (container.clientWidth - el.offsetWidth) / 2;
    container.scrollTo({ left: target, behavior: smooth ? 'smooth' : 'auto' });
  }

  // Among the (real + cloned) copies of an item, pick whichever sits closest to
  // the container's current scroll position, so navigation never jumps across the loop.
  function nearestOf(container, items, filter) {
    const matches = items.filter(el => filterOf(el) === filter);
    const center = container.scrollLeft + container.clientWidth / 2;
    return matches.reduce((best, el) => {
      const dist = Math.abs((el.offsetLeft + el.offsetWidth / 2) - center);
      return dist < best.dist ? { el, dist } : best;
    }, { el: matches[0], dist: Infinity }).el;
  }

  // If the item closest to center is sitting in a cloned set, silently jump the
  // scroll position to its twin in the middle (real) set — invisible, since clones
  // are identical — so there's always a full loop of buffer left to scroll into.
  function rewrapToMiddle(container, items, setSize, el) {
    const idx = items.indexOf(el);
    if (idx < setSize || idx >= setSize * 2) {
      const middleEquivalent = items[(idx % setSize) + setSize];
      container.scrollLeft += middleEquivalent.offsetLeft - el.offsetLeft;
      return middleEquivalent;
    }
    return el;
  }

  function fadeBackground(src) {
    if (!bgImg || !src || bgImg.dataset.current === src) return;
    bgImg.dataset.current = src;
    bgImg.style.opacity = '0';
    setTimeout(() => {
      bgImg.onload = () => { bgImg.style.opacity = '1'; };
      bgImg.src = src;
    }, 200);
  }

  function activate(filter, smooth) {
    const card = nearestOf(track, cards, filter);
    const pill = nearestOf(tabs, pills, filter);
    cards.forEach(c => c.classList.toggle('is-active', c === card));
    pills.forEach(p => p.classList.toggle('active', p === pill));
    centerIn(track, card, smooth);
    centerIn(tabs, pill, smooth);
    if (card) fadeBackground(card.dataset.bg);
  }

  pills.forEach(btn => {
    btn.addEventListener('click', () => activate(filterOf(btn), true));
  });

  cards.forEach(card => {
    card.addEventListener('click', e => {
      if (!card.classList.contains('is-active')) {
        e.preventDefault();
        activate(filterOf(card), true);
      }
    });
  });

  function order() {
    return cards.slice(cardSetSize, cardSetSize * 2).map(filterOf);
  }
  function step(dir) {
    const list = order();
    const active = cards.find(c => c.classList.contains('is-active'));
    const curIdx = list.indexOf(filterOf(active || cards[cardSetSize]));
    const nextIdx = (curIdx + dir + list.length) % list.length;
    activate(list[nextIdx], true);
  }
  const prevBtn = menuExp.querySelector('.menu-exp-nav.prev');
  const nextBtn = menuExp.querySelector('.menu-exp-nav.next');
  if (prevBtn) prevBtn.addEventListener('click', () => step(-1));
  if (nextBtn) nextBtn.addEventListener('click', () => step(1));

  function watchScroll(container, items, setSize) {
    let timer;
    container.addEventListener('scroll', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const center = container.scrollLeft + container.clientWidth / 2;
        let closest = null;
        let closestDist = Infinity;
        items.forEach(el => {
          const dist = Math.abs((el.offsetLeft + el.offsetWidth / 2) - center);
          if (dist < closestDist) { closestDist = dist; closest = el; }
        });
        if (!closest) return;
        const settled = rewrapToMiddle(container, items, setSize, closest);
        activate(filterOf(settled), true);
      }, 150);
    }, { passive: true });
  }

  watchScroll(track, cards, cardSetSize);
  watchScroll(tabs, pills, pillSetSize);

  // On load, jump straight to whichever card/tab matches the pill marked active in the
  // HTML, starting on the middle (real) set so there's a full loop of buffer either way.
  const initialPill = tabs.querySelector('.tab-pill.active') || pills[0];
  activate(filterOf(initialPill), false);
});

document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
      if (navLinks) {
        navLinks.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.textContent = '☰';
      }
    }
  });
});
