/* The Unkwn Wedding Palace — hero.
   Same stack as our Spread build: GSAP + ScrollTrigger (scroll-linked motion) and Lenis (smooth scrolling). */

const root = document.documentElement;
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
if (reduceMotion) root.classList.add("reduce");
gsap.registerPlugin(ScrollTrigger);

/* ---------- 1. Hero headline: wrap each word in a mask ---------- */
// <span class="w"><span style="--i:3">word</span></span>   (the outer span clips, the inner one moves)
function splitWords(el) {
  let i = 0;
  const walk = (parent) => {
    [...parent.childNodes].forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) return walk(node); // step inside <em>; <br> has no text
      if (node.nodeType !== Node.TEXT_NODE) return;
      const frag = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) return frag.append(" ");
        const mask = document.createElement("span");
        const word = document.createElement("span");
        mask.className = "w";
        word.textContent = part;
        word.style.setProperty("--i", i++);   // CSS turns --i into the stagger delay
        mask.append(word);
        frag.append(mask);
      });
      node.replaceWith(frag);
    });
  };
  walk(el);
}
document.querySelectorAll("[data-split]").forEach(splitWords);

// Start the entrance once the fonts are in, so words don't slide up and THEN reflow into a new font.
// Two frames later = the hidden start state has been painted, so the transition actually runs.
const start = () => requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add("ready")));
Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1200))]).then(start);

/* ---------- 2. Smooth scrolling (Lenis), with Spread's settings ---------- */
let smoothScroll;
if (!reduceMotion) {
  const lenis = smoothScroll = new Lenis({ duration: 1.2, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), touchMultiplier: 1.5 });
  lenis.on("scroll", ScrollTrigger.update);           // keep ScrollTrigger in sync with the smoothed position
  gsap.ticker.add((time) => lenis.raf(time * 1000));  // one clock for both libraries
  gsap.ticker.lagSmoothing(0);
}

/* ---------- 3. Hero scroll scene ---------- */
const nav = document.getElementById("nav");
const heroMain = document.getElementById("heroMain");
// Positions are "<trigger edge> <screen edge>": "30% top" = when 30% of the hero has passed the top of the screen.
const heroScrub = (start, end) => ({ trigger: "#hero", start, end, scrub: true });

if (reduceMotion) {
  ScrollTrigger.create({ trigger: "#hero", start: "15% top", toggleClass: { targets: nav, className: "scrolled" } });
} else {
  // Main layer shrinks 1 → 0.25 over the first 30%. We drive it from the trigger's progress ourselves because
  // two things depend on the current scale:
  //  - the corner: a radius is scaled along with the element, so for a visual 16px we set 16 / scale;
  //  - the nav: it switches the moment the card's top edge ((1 - scale) / 2 of the screen) passes the nav.
  //    Spread switches at a fixed 15%, which leaves white nav text on the cream page for a while.
  ScrollTrigger.create({
    ...heroScrub("top top", "30% top"),
    onUpdate: ({ progress: k }) => {
      const scale = 1 - 0.75 * k;
      gsap.set(heroMain, { scale, borderRadius: (16 * k) / scale });
      const cardTop = ((1 - scale) / 2) * innerHeight;
      nav.classList.toggle("scrolled", cardTop > nav.offsetTop);
      document.querySelector(".nav-links").inert = cardTop > nav.offsetTop;
    },
  });
  // Belt and braces: whatever the card does, the nav is collapsed past 15%.
  ScrollTrigger.create({ trigger: "#hero", start: "15% top", onEnter: () => nav.classList.add("scrolled") });

  // Text fades and lifts away (autoAlpha = opacity + visibility: hidden at 0, so invisible links can't be clicked).
  gsap.to("#heroContent", { autoAlpha: 0, y: -60, ease: "none", scrollTrigger: heroScrub("3% top", "14% top") });
  gsap.to("#pause-button", { autoAlpha: 0, ease: "none", scrollTrigger: heroScrub("3% top", "10% top") });

  // Gallery tiles: fade in early, and rise over the WHOLE hero at different speeds (parallax = depth).
  const tileEnd = [-280, -400, -220, -360, -300, -250, -420, -240];
  gsap.utils.toArray(".tile").forEach((el, i) => {
    gsap.to(el, { opacity: 1, ease: "none", scrollTrigger: heroScrub("8% top", "18% top") });
    gsap.fromTo(el, { y: 400 + i * 30 }, { y: tileEnd[i], ease: "none", scrollTrigger: heroScrub("top top", "bottom top") });
  });
}


// Attach HLS on Chromium, or use native streaming on Safari.
const background = document.querySelector('#background-video');
const film = document.querySelector('#film-video');
const menu = document.querySelector('#menu-dialog');
const viewer = document.querySelector('#film-dialog');
const menuButton = document.querySelector('.menu-toggle');
const inquire = document.querySelector('#inquire-dialog');
const pauseButton = document.querySelector('#pause-button');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let backgroundWasPlaying = false;
let viewerReturnFocus;

// startAt: where the first play begins, in seconds. The loop then wraps back to 0 as usual.
function attachVideo(video, source, autoplay, startAt = 0) {
  if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = source;
  } else if (window.Hls && Hls.isSupported()) {
    const player = new Hls({ maxBufferLength: 15, startPosition: startAt || -1 });
    player.loadSource(source);
    player.attachMedia(video);
    video.player = player;
  }
  // Jump once the video can play: Safari/Chrome's built-in HLS player resets to 0 if we seek any earlier.
  video.addEventListener('canplay', () => {
    if (startAt && video.currentTime < startAt - 1) video.currentTime = startAt;
    if (autoplay) video.play().catch(() => {});
  }, { once: true });
}

// Open on the last clip (the embrace, then the couple in green) instead of the hazy sparkler shot.
// Starting late keeps the clips in their original order, so playback never jumps between timestamps.
attachVideo(background, 'assets/banner/loop.m3u8', !reducedMotion.matches, 9.4);
background.autoplay = !reducedMotion.matches;

// Keep the background pause control accurate, including autoplay restrictions.
function updatePauseButton() {
  const paused = background.paused;
  pauseButton.innerHTML = `<span aria-hidden="true">${paused ? '▷' : 'Ⅱ'}</span> ${paused ? 'Play film' : 'Pause film'}`;
  pauseButton.setAttribute('aria-label', `${paused ? 'Play' : 'Pause'} background video`);
}
background.addEventListener('play', updatePauseButton);
background.addEventListener('pause', updatePauseButton);
pauseButton.addEventListener('click', () => {
  if (background.paused) background.play().catch(() => {});
  else background.pause();
});
reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches) background.pause();
});

// Native modal dialogs contain keyboard focus and dismiss with Escape.
function lockPage() {
  document.body.style.overflow = menu.open || viewer.open || inquire.open ? 'hidden' : '';
}
menuButton.addEventListener('click', () => {
  menu.showModal();
  menuButton.setAttribute('aria-expanded', 'true');
  lockPage();
});
document.querySelector('.close-menu').addEventListener('click', () => menu.close());
menu.addEventListener('close', () => {
  menuButton.setAttribute('aria-expanded', 'false');
  lockPage();
});

// Play a wedding clip with sound only after the visitor explicitly asks.
document.querySelectorAll('[data-watch]').forEach(button => {
  button.addEventListener('click', () => {
    viewerReturnFocus = menu.open ? menuButton : button;
    if (menu.open) menu.close();
    backgroundWasPlaying = !background.paused;
    background.pause();
    viewer.showModal();
    lockPage();
    // A button can name its film in data-watch; buttons without one play the traditional wedding film.
    const source = button.dataset.watch || 'https://theunkwnpalace.com/video/trad/output1.m3u8';
    if (film.dataset.src !== source) {
      film.player?.destroy();
      film.player = null;
      attachVideo(film, source, true);
      film.dataset.src = source;
    }
    film.play().catch(() => {});
  });
});
document.querySelector('#close-film').addEventListener('click', () => viewer.close());
viewer.addEventListener('close', () => {
  film.pause();
  if (backgroundWasPlaying && !reducedMotion.matches) background.play().catch(() => {});
  lockPage();
  viewerReturnFocus?.focus();
});
updatePauseButton();

// Pause smooth scrolling while either modal owns input; resume on dismissal.
function syncModalScrolling() {
  if (menu.open || viewer.open || inquire.open) smoothScroll?.stop();
  else smoothScroll?.start();
}
menu.addEventListener('toggle', syncModalScrolling);
viewer.addEventListener('toggle', syncModalScrolling);
inquire.addEventListener('toggle', syncModalScrolling);

/* ---------- Links to a section ("Watch the films", nav, menu) ----------
   Lenis does the scrolling so the jump glides like the rest of the page. From the menu, close it first. */
document.querySelectorAll('[data-scroll-to]').forEach(link => {
  link.addEventListener('click', event => {
    const target = document.querySelector(link.getAttribute('href'));
    if (!target) return;
    event.preventDefault();
    if (menu.open) menu.close();
    if (smoothScroll) smoothScroll.scrollTo(target, { duration: 1.6 });
    else target.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth' });
  });
});

/* ---------- Section entrances (Spread's) ----------
   Each .reveal fades up 28px when its top reaches 90% down the screen; the photo card rises 40px. Plays once. */
if (!reduceMotion) {
  gsap.utils.toArray('.reveal').forEach(el => {
    gsap.from(el, { y: 28, opacity: 0, duration: 0.7, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%' } });
  });
  gsap.utils.toArray('.feature-media').forEach(el => {
    gsap.from(el, { y: 40, opacity: 0, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%' } });
  });
}
/* ---------- Film cards: play silently while on screen ----------
   Each stream is attached the first time its card comes into view, so the page doesn't load three videos
   up front. With reduced motion the cards keep their still posters. */
const filmCards = new IntersectionObserver(entries => {
  entries.forEach(({ target: video, isIntersecting }) => {
    if (!isIntersecting || reducedMotion.matches) {
      video.pause();
      return;
    }
    if (!video.dataset.attached) {
      attachVideo(video, video.dataset.src, false);
      video.dataset.attached = 'true';
    }
    video.play().catch(() => {});
  });
}, { threshold: 0.25 });
document.querySelectorAll('.feature-video').forEach(video => filmCards.observe(video));

/* ---------- Meet the filmmaker: slide-over (Spread's control card) ----------
   The card rises an extra 120px while its top travels from the bottom of the screen to 60% up, on top of
   the -100px overlap from CSS, so it really feels like it's sliding over the films. */
if (!reduceMotion) {
  gsap.from('.filmmaker', { y: 120, ease: 'none', scrollTrigger: { trigger: '.filmmaker', start: 'top bottom', end: 'top 60%', scrub: true } });
}

/* ---------- Kind words: the testimonial drum (our Wispr Flow build) ----------
   The seven cards form one row, 14% of a card width apart (22% on phones). A "head" moves along the row as
   you scroll; each card's distance from the head is its place on screen (x, 0 = the middle). Each card also
   spins (rotateX) around a point BEHIND it, from -50° on the left, flat in the middle, to +50° on the right.
   Spinning around a point behind the card is what lifts it from bottom-left to top-right, like riding over a
   drum. Wispr's settings: orbit 65% of a card width, perspective 2.6 card widths, spin spread over 2.1
   widths either side, power1.inOut, scrub 1.5s (instant on phones). */
const voicesTrack = document.querySelector('#voicesTrack');
const voicesStage = document.querySelector('#voicesStage');
const vcards = [...voicesStage.querySelectorAll('.vcard')];
if (!reduceMotion && vcards.length) {
  const ROT_IN = -50;
  const ROT_OUT = 50;
  const spinEase = gsap.parseEase('power1.inOut');
  let drum = null;

  const buildDrum = () => {
    if (drum) {
      drum.scrollTrigger.kill();
      drum.kill();
    }
    const phone = innerWidth < 768;
    // offsetWidth, not the on-screen box: a tilted card's box is its squashed projection
    const widths = vcards.map(card => card.offsetWidth);
    const middleW = [...widths].sort((a, b) => a - b)[Math.floor(widths.length / 2)];
    const gap = Math.min(160, Math.max(32, middleW * (phone ? 0.22 : 0.14)));
    const offsets = [0];
    for (let i = 1; i < vcards.length; i++) {
      offsets[i] = offsets[i - 1] + (widths[i - 1] + widths[i]) / 2 + gap;
    }
    const rowLength = offsets[offsets.length - 1];
    const orbit = Math.max(220, middleW * 0.65);
    const perspective = middleW * 2.6;
    const spinHalf = middleW * 2.1;
    voicesStage.style.perspective = `${perspective}px`;
    vcards.forEach(card => {
      card.style.transformOrigin = `50% 50% -${orbit}px`;
    });

    const spinAt = x => {
      const p = gsap.utils.clamp(0, 1, (x + spinHalf) / (2 * spinHalf));
      return ROT_IN + (ROT_OUT - ROT_IN) * spinEase(p);
    };
    // A tilted card swings back in depth, so perspective draws it closer to the middle than its place in the
    // row. Dividing x by that shrink factor puts it back where the row says, so the gaps look even.
    const shrinkAt = x => perspective / (perspective + orbit * (1 - Math.cos(spinAt(x) * Math.PI / 180)));
    const render = head => {
      const xs = vcards.map((card, i) => head - offsets[i]);
      vcards.forEach((card, i) => {
        card.style.transform = `translateX(${(xs[i] / shrinkAt(xs[i])).toFixed(1)}px) rotateX(${spinAt(xs[i]).toFixed(2)}deg)`;
      });
      // The card nearest the middle is on top
      [...vcards.keys()]
        .sort((a, b) => Math.abs(xs[a]) - Math.abs(xs[b]))
        .forEach((i, rank) => {
          vcards[i].style.zIndex = vcards.length - rank;
        });
    };

    // The track is the stage's height plus 0.55px of scrolling per px of row (Wispr used 0.85; a third
    // shorter keeps it a flourish rather than a long hallway)
    voicesTrack.style.height = `${Math.round(innerHeight + rowLength * 0.55)}px`;
    const head = { h: 0 };
    render(0);
    drum = gsap.to(head, {
      h: rowLength,
      ease: 'none',
      onUpdate: () => render(head.h),
      scrollTrigger: { trigger: voicesTrack, start: 'top top', end: 'bottom bottom', scrub: phone ? true : 1.5 },
    });
  };

  buildDrum();
  let drumWidth = innerWidth;
  let drumTimer;
  addEventListener('resize', () => {
    if (innerWidth === drumWidth) return;
    drumWidth = innerWidth;
    clearTimeout(drumTimer);
    drumTimer = setTimeout(() => {
      buildDrum();
      ScrollTrigger.refresh();
    }, 200);
  });
  document.fonts.ready.then(() => {
    buildDrum();
    ScrollTrigger.refresh();
  });
}

/* ---------- Investment: cards rise in one by one (Spread's) ----------
   When the row's top reaches 85% down the screen, each card gets .is-in 100ms after the one before. */
if (!reduceMotion) {
  ScrollTrigger.create({
    trigger: '#plans',
    start: 'top 85%',
    once: true,
    onEnter: () => document.querySelectorAll('.plan').forEach((plan, i) => setTimeout(() => plan.classList.add('is-in'), i * 100)),
  });
} else {
  document.querySelectorAll('.plan').forEach(plan => plan.classList.add('is-in'));
}

/* ---------- Small events: endless photo strip (Spread's) ----------
   Move the row left by exactly one set's length over 40s, forever. The modifier wraps x back into 0…−set, so after
   one set it snaps to 0, invisible because the second set looks exactly like the first.
   - One set's length = the distance from the first photo to its copy (the first photo of the second set). Half the
     row's width is NOT that: the row has one gap fewer than two full sets, so the wrap jumped 8px every loop.
   - Rebuilt only when the screen WIDTH changes (the photos resize at the breakpoints). Phones fire "resize" every
     time the address bar shows or hides while scrolling; rebuilding on those snapped the strip back to its start.
     A rebuild keeps the current position, and stays paused if the section is off screen. */
const strip = document.querySelector('#stripTrack');
if (!reduceMotion) {
  const photos = strip.children;
  let loop;
  let onScreen = false;
  let stripWidth = innerWidth;

  const buildStrip = () => {
    const progress = loop ? loop.progress() : 0;
    if (loop) loop.kill();
    gsap.set(strip, { x: 0 });
    const set = photos[photos.length / 2].offsetLeft - photos[0].offsetLeft;
    loop = gsap.to(strip, {
      x: -set,
      duration: 40,
      ease: 'none',
      repeat: -1,
      paused: !onScreen,
      modifiers: { x: gsap.utils.unitize(x => parseFloat(x) % set) },
    });
    loop.progress(progress);
  };
  buildStrip();

  let stripTimer;
  addEventListener('resize', () => {
    if (innerWidth === stripWidth) return;   // only the height changed (a phone's address bar): leave it running
    stripWidth = innerWidth;
    clearTimeout(stripTimer);
    stripTimer = setTimeout(buildStrip, 200);
  });
  ScrollTrigger.create({
    trigger: '#events',
    start: 'top bottom',
    end: 'bottom top',
    onToggle: st => {
      onScreen = st.isActive;
      if (onScreen) loop.play();
      else loop.pause();
    },
  });
}

/* ---------- Closing: photo-break card (Spread's) ----------
   Frame: full-bleed → card (16px in from each side, 24px corners) while its top travels from 80% to 20% of the
   screen. Film: drifts down and zooms out across the whole time the section is on screen (parallax). */
if (!reduceMotion) {
  gsap.utils.toArray('.photo-break').forEach(el => {
    gsap.to(el, {
      '--inset': '16px',
      ease: 'none',
      scrollTrigger: { trigger: el, start: 'top 80%', end: 'top 20%', scrub: true },
    });
    gsap.fromTo(el.querySelector('.photo-break-img'), { scale: 1.2, yPercent: -8 }, {
      scale: 1.02,
      yPercent: 4,
      ease: 'none',
      scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });
}

/* ---------- Pull-up footer (our Dosedrop build) ----------
   The moment the page's bottom edge rises above the bottom of the screen, flag the body: the footer fades in
   (CSS). Before that it stays hidden, so it can never peek through early. */
const pageSheet = document.querySelector('main');
let footQueued = false;
const updateFoot = () => {
  footQueued = false;
  document.body.dataset.lifting = String(pageSheet.getBoundingClientRect().bottom < innerHeight + 1);
};
const queueFoot = () => {
  if (footQueued) return;
  footQueued = true;
  requestAnimationFrame(updateFoot);
};
addEventListener('scroll', queueFoot, { passive: true });
addEventListener('resize', queueFoot);
updateFoot();

/* ---------- Inquire: the in-house form in a full-screen panel ----------
   Any element with data-inquire opens it (from the menu too: the menu closes first). data-inquire="modern" etc.
   pre-selects that package, so "Get started" on a pricing card arrives with its package already picked.
   Concept site: submitting doesn't send anything; it swaps the form for the thank-you screen. For the real site,
   post the FormData to his email service or HoneyBook in the submit handler. */
const inquireForm = document.querySelector('#inquireForm');
const inquireThanks = document.querySelector('#inquireThanks');
let inquireReturnFocus;

document.querySelectorAll('[data-inquire]').forEach(link => {
  link.addEventListener('click', event => {
    event.preventDefault();
    inquireReturnFocus = menu.open ? menuButton : link;
    if (menu.open) menu.close();
    const pkg = link.dataset.inquire;
    if (pkg) inquireForm.querySelector(`input[name="package"][value="${pkg}"]`).checked = true;
    inquire.showModal();
    lockPage();
  });
});

document.querySelectorAll('.close-inquire').forEach(button => {
  button.addEventListener('click', () => inquire.close());
});

inquire.addEventListener('close', () => {
  lockPage();
  inquireReturnFocus?.focus();
  // After a sent inquiry, the next visit starts with a fresh form.
  if (!inquireThanks.hidden) {
    inquireForm.reset();
    inquireForm.hidden = false;
    inquireThanks.hidden = true;
  }
});

// The browser checks the required fields (names, email, date) before this runs.
inquireForm.addEventListener('submit', event => {
  event.preventDefault();
  const names = inquireForm.elements.names.value.trim();
  inquireThanks.querySelector('[data-thanks-name]').textContent = names || 'both';
  inquireForm.hidden = true;
  inquireThanks.hidden = false;
  inquireThanks.querySelector('h2').focus();   // screen readers hear the thank-you
  inquire.scrollTop = 0;
});
