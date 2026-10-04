import './style.css';
import { previewSource } from './preview';

const SITE_TITLE = 'motion-lab';
// Each live preview owns a render loop and may also hold a WebGL context.
const MAX_LIVE = 8;

type Work = {
  no: string;
  slug: string;
  file: string;
  title: string;
  source: string;
  poster?: string;
};

// Each work is one self-contained HTML file. The same source is rendered in the
// frame and shown as code, so what visitors copy is exactly what they saw run.
const sources = import.meta.glob<string>('../works/*.html', {
  query: '?raw',
  import: 'default',
  eager: true,
});

// Stills from `npm run posters`; a work without one shows its frame empty until it runs.
const posters = import.meta.glob<string>('../posters/*.jpg', {
  query: '?url',
  import: 'default',
  eager: true,
});

const works: Work[] = Object.entries(sources)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([path, source]) => {
    const file = path.split('/').pop()!;
    const match = file.match(/^(\d+)-(.+)\.html$/);
    if (!match) throw new Error(`Work file must be named like "001-slug.html": ${file}`);
    const title = new DOMParser().parseFromString(source, 'text/html').title;
    return {
      no: match[1],
      slug: match[2],
      file,
      title: title || match[2],
      source,
      poster: posters[`../posters/${file.replace(/\.html$/, '.jpg')}`],
    };
  });

const app = document.getElementById('app')!;
let galleryScroll = 0;
let teardown = () => {};

function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const el = Object.assign(document.createElement(tag), props);
  el.append(...children);
  return el;
}

function createFrame(work: Work, preview = false): HTMLIFrameElement {
  const frame = h('iframe', { title: work.title, srcdoc: preview ? previewSource(work.source) : work.source });
  // Works run with an opaque origin: they can animate but cannot touch the gallery.
  frame.sandbox.add('allow-scripts');
  // Reveal the frame once it has had time to draw, so the poster never flashes blank.
  frame.addEventListener('load', () => setTimeout(() => frame.classList.add('ready'), 150), { once: true });
  return frame;
}

function placard(work: Work): HTMLElement {
  return h('div', { className: 'placard' }, [
    h('span', { className: 'placard-no', textContent: work.no }),
    h('span', { className: 'placard-title', textContent: work.title }),
  ]);
}

function header(): HTMLElement {
  return h('header', { className: 'site-header' }, [h('a', { className: 'site-title', href: '#/', textContent: SITE_TITLE })]);
}

function renderGallery() {
  document.title = SITE_TITLE;

  const visible = new Set<HTMLDivElement>();
  let hovered: HTMLDivElement | null = null;

  // Run the hovered frame plus the first visible ones in page order; the rest show posters.
  function updateLive() {
    const order = [...canvases].filter((c) => visible.has(c));
    const live = new Set(order.filter((canvas) => canvas !== hovered).slice(0, MAX_LIVE - (hovered ? 1 : 0)));
    if (hovered) live.add(hovered);
    for (const canvas of canvases) {
      const frame = canvas.querySelector('iframe');
      if (live.has(canvas) && !frame) canvas.append(createFrame(works[Number(canvas.dataset.index)], true));
      if (!live.has(canvas) && frame) frame.remove();
    }
  }

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const canvas = entry.target as HTMLDivElement;
      if (entry.isIntersecting) visible.add(canvas);
      else visible.delete(canvas);
    }
    updateLive();
  });

  const canvases = works.map((work, index) => {
    const canvas = h('div', { className: 'frame-canvas' });
    canvas.dataset.index = String(index);
    if (work.poster) canvas.style.backgroundImage = `url(${work.poster})`;
    observer.observe(canvas);
    return canvas;
  });

  const grid = h(
    'div',
    { className: 'grid' },
    works.map((work, index) => {
      const piece = h('a', { className: 'piece', href: `#/w/${work.slug}` }, [
        h('div', { className: 'frame' }, [canvases[index]]),
        placard(work),
      ]);
      piece.addEventListener('pointerenter', () => {
        hovered = canvases[index];
        updateLive();
      });
      piece.addEventListener('pointerleave', () => {
        hovered = null;
        updateLive();
      });
      return piece;
    }),
  );

  app.replaceChildren(header(), h('main', { className: 'gallery' }, [grid]));
  window.scrollTo(0, galleryScroll);
  return () => {
    galleryScroll = window.scrollY;
    observer.disconnect();
  };
}

let highlighter: Promise<(code: string) => string> | undefined;

function highlight(code: string): Promise<string> {
  highlighter ??= (async () => {
    const [{ createHighlighterCore }, { createJavaScriptRegexEngine }] = await Promise.all([
      import('shiki/core'),
      import('shiki/engine/javascript'),
    ]);
    const core = await createHighlighterCore({
      themes: [import('shiki/themes/vitesse-dark.mjs')],
      langs: [import('shiki/langs/html.mjs')],
      engine: createJavaScriptRegexEngine(),
    });
    return (source: string) => core.codeToHtml(source, { lang: 'html', theme: 'vitesse-dark' });
  })();
  return highlighter.then((fn) => fn(code));
}

function renderWork(index: number) {
  const work = works[index];
  const prev = works[(index - 1 + works.length) % works.length];
  const next = works[(index + 1) % works.length];
  document.title = `${work.title} – ${SITE_TITLE}`;
  window.scrollTo(0, 0);

  const frame = createFrame(work);
  const fullscreen = h('button', { className: 'btn', type: 'button', textContent: '全屏' });
  fullscreen.addEventListener('click', () => frame.requestFullscreen());

  const copy = h('button', { className: 'btn', type: 'button', textContent: '复制' });
  let resetLabel = 0;
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(work.source);
      copy.textContent = '已复制';
    } catch {
      copy.textContent = '复制失败';
    }
    clearTimeout(resetLabel);
    resetLabel = window.setTimeout(() => (copy.textContent = '复制'), 1600);
  });

  const code = h('div', { className: 'code-body' }, [h('pre', {}, [h('code', { textContent: work.source })])]);
  let alive = true;
  highlight(work.source).then((html) => {
    if (alive) code.innerHTML = html;
  });

  const onKey = (event: KeyboardEvent) => {
    if (event.metaKey || event.ctrlKey || event.altKey || event.target instanceof HTMLInputElement) return;
    if (event.key === 'ArrowLeft') location.hash = `#/w/${prev.slug}`;
    if (event.key === 'ArrowRight') location.hash = `#/w/${next.slug}`;
  };
  window.addEventListener('keydown', onKey);

  const canvas = h('div', { className: 'frame-canvas' }, [frame]);
  if (work.poster) canvas.style.backgroundImage = `url(${work.poster})`;

  app.replaceChildren(
    header(),
    h('main', { className: 'work' }, [
      h('section', { className: 'stage' }, [
        h('div', { className: 'frame' }, [canvas]),
        h('div', { className: 'stage-bar' }, [
          placard(work),
          h('nav', { className: 'stage-actions' }, [
            h('a', { className: 'btn', href: `#/w/${prev.slug}`, title: prev.title, textContent: '←' }),
            h('a', { className: 'btn', href: `#/w/${next.slug}`, title: next.title, textContent: '→' }),
            fullscreen,
          ]),
        ]),
      ]),
      h('section', { className: 'code' }, [
        h('div', { className: 'code-bar' }, [h('span', { className: 'code-file', textContent: work.file }), copy]),
        code,
      ]),
    ]),
  );
  return () => {
    alive = false;
    clearTimeout(resetLabel);
    window.removeEventListener('keydown', onKey);
  };
}

function route() {
  teardown();
  teardown = () => {};
  const slug = location.hash.match(/^#\/w\/(.+)$/)?.[1];
  const index = slug ? works.findIndex((w) => w.slug === decodeURIComponent(slug)) : -1;
  if (slug && index < 0) {
    location.replace('#/');
    return;
  }
  teardown = index >= 0 ? renderWork(index) : renderGallery();
}

history.scrollRestoration = 'manual';
window.addEventListener('hashchange', route);
route();
