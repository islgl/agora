/** @jsxRuntime classic */
const { useState, useEffect, useRef } = React;

const VERSION = '0.1.0-alpha.2';
const GH_URL  = 'https://github.com/islgl/agora';
const REL_URL = 'https://github.com/islgl/agora/releases';
const DMG_URL = 'https://github.com/islgl/agora/releases/download/v0.1.0-alpha.2/Agora_0.1.0-alpha.2_aarch64.dmg';

// Inline SVG — no library, no emoji.
const ArrowRight = ({ className = 'btn-arrow' }) => (
  <svg className={className} width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="M2 7h10M8.5 3.5L12 7l-3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const Apple = () => (
  <svg className="i" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" width="14" height="14">
    <path d="M11.33 4.66c-.62.73-1.52 1.3-2.4 1.22-.11-.9.34-1.85.92-2.44.65-.7 1.63-1.2 2.43-1.25.1.94-.3 1.83-.95 2.47ZM12.3 6.2c-1.32-.08-2.43.74-3.06.74-.64 0-1.6-.7-2.64-.68-1.36.02-2.61.78-3.31 1.98-1.41 2.43-.36 6.02 1.02 8 .67.96 1.47 2.04 2.52 2 .99-.04 1.37-.65 2.58-.65 1.2 0 1.54.65 2.6.63 1.08-.02 1.76-.98 2.42-1.95.75-1.1 1.06-2.18 1.08-2.24-.02-.01-2.08-.8-2.1-3.17-.02-1.97 1.6-2.92 1.68-2.97-.92-1.36-2.34-1.5-2.82-1.52Z"/>
  </svg>
);
const GitHub = () => (
  <svg className="i" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" width="14" height="14">
    <path d="M8 0a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38v-1.34c-2.23.48-2.7-1.07-2.7-1.07-.36-.92-.89-1.17-.89-1.17-.73-.5.05-.49.05-.49.8.06 1.23.82 1.23.82.71 1.22 1.87.87 2.33.66.07-.52.28-.87.5-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.58.82-2.14-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.65 7.65 0 0 1 4 0c1.53-1.03 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.14 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48v2.19c0 .21.15.46.55.38A8 8 0 0 0 8 0Z"/>
  </svg>
);
const Sun = () => (
  <svg className="i" viewBox="0 0 16 16" fill="none" aria-hidden="true" width="14" height="14">
    <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.5"/>
    <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.4 1.4M11.6 11.6 13 13M3 13l1.4-1.4M11.6 4.4 13 3"/>
    </g>
  </svg>
);
const Moon = () => (
  <svg className="i" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" width="14" height="14">
    <path d="M13.5 10.5a5 5 0 0 1-7-7 6.3 6.3 0 1 0 7 7Z"/>
  </svg>
);

// Scroll reveal hook — IntersectionObserver lazy fade/lift.
function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -5% 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

function Nav({ dark, onToggleDark }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <nav className="nav" data-scrolled={scrolled}>
      <div className="container nav-inner">
        <a className="brand" href="#top" aria-label="Agora home">
          <img src="./assets/logo-light.png" alt="" />
          <span>Agora</span>
        </a>
        <div className="nav-links">
          <a href="#inside" className="link-underline">Inside</a>
          <a href="#local" className="link-underline">Local</a>
          <a href="#install" className="link-underline">Install</a>
          <a href={GH_URL} className="link-underline" target="_blank" rel="noreferrer">GitHub</a>
          <button className="nav-theme" onClick={onToggleDark} aria-label="Toggle theme">
            {dark ? <Sun /> : <Moon />}
            <span>{dark ? 'Light' : 'Dark'}</span>
          </button>
        </div>
      </div>
    </nav>
  );
}

function Compass() {
  // Four long petals (cardinal) bloom first, then four short petals
  // (intercardinal), then the plum core. Each petal's rotation is baked
  // into --rot so CSS can animate scale while preserving the petal's
  // radial angle; --d staggers the bloom by ~100ms per petal.
  const longs = [
    { rot: 0,   d: 0.35 },
    { rot: 90,  d: 0.45 },
    { rot: 180, d: 0.55 },
    { rot: 270, d: 0.65 },
  ];
  const shorts = [
    { rot: 45,  d: 0.80 },
    { rot: 135, d: 0.90 },
    { rot: 225, d: 1.00 },
    { rot: 315, d: 1.10 },
  ];
  return (
    <div className="compass" aria-hidden="true">
      <svg className="compass-svg" viewBox="0 0 100 100">
        {longs.map((p, i) => (
          <g key={'L' + i} className="petal petal-long" style={{ '--rot': p.rot + 'deg', '--d': p.d + 's' }}>
            <ellipse cx="50" cy="22" rx="3" ry="20" />
          </g>
        ))}
        {shorts.map((p, i) => (
          <g key={'S' + i} className="petal petal-short" style={{ '--rot': p.rot + 'deg', '--d': p.d + 's' }}>
            <ellipse cx="50" cy="28" rx="2" ry="13" />
          </g>
        ))}
        <circle className="core" cx="50" cy="50" r="2.2" />
      </svg>
    </div>
  );
}

function Hero() {
  const ref = useReveal();
  return (
    <section className="hero" id="top">
      <Compass />
      <div className="container hero-body">
        <div ref={ref} className="reveal">
          <div className="hero-eyebrow">
            <span className="dot" />
            <span>A desktop AI chat client · macOS · alpha</span>
          </div>
          <h1 className="hero-display">
            <span className="stay-in">Stay in</span>
            <span className="one">One<span className="one-dot">.</span></span>
          </h1>
          <p className="hero-sub">
            One chat. One agent runtime. One local archive for every note, memory,
            and half-formed thought.
            <br />
            <em>Your AI stays where you are</em> — on your Mac, under your roof,
            stored as files you can open with any editor.
          </p>
          <div className="hero-meta">
            <a className="btn btn-primary" href={DMG_URL}>
              <Apple />
              <span>Download for macOS</span>
              <ArrowRight />
            </a>
            <a className="btn btn-secondary" href={GH_URL} target="_blank" rel="noreferrer">
              <GitHub />
              <span>View on GitHub</span>
            </a>
            <span className="version-pill">v{VERSION} · Apple Silicon · ~16 MB</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function Whisper() {
  const ref = useReveal();
  return (
    <section className="whisper">
      <div className="container">
        <div ref={ref} className="reveal whisper-inner">
          <div className="whisper-label">Note to the reader</div>
          <p className="whisper-body">
            The model providers keep changing. The platforms keep splintering.
            Agora is a quiet place to <span className="underline-ink">stay in one</span> —
            with your agent, your memory, and the slow accretion of
            everything you actually care about.
          </p>
        </div>
      </div>
    </section>
  );
}

const LAYERS = [
  {
    n: 'I.',
    name: 'Brand Layer',
    tag: '~/.agora/config/',
    body: (
      <>
        Five Markdown files — <em>SOUL</em>, <em>USER</em>, <em>TOOLS</em>, <em>MEMORY</em>, <em>AGENTS</em> —
        that tell the model who it is and who you are. Injected into every turn
        as structured XML, but maintained like any other notebook, in prose.
      </>
    ),
  },
  {
    n: 'II.',
    name: 'LLM-Wiki',
    tag: '~/.agora/wiki/',
    body: (
      <>
        Structured knowledge pages under <em>concepts / projects / domains</em>.
        A per-turn selector pulls what matters; the chat header shows you
        exactly which pages were consulted. No black box.
      </>
    ),
  },
  {
    n: 'III.',
    name: 'Raw Inbox',
    tag: '~/.agora/raw/',
    body: (
      <>
        Drop a PDF, an article, a voice note — a background subagent turns it
        into a Wiki page on its own. A single Finder folder replaces the
        drag-and-drop carousel of ChatGPT / Claude / Gemini.
      </>
    ),
  },
  {
    n: 'IV.',
    name: 'Auto Memory',
    tag: 'HNSW · SQLite',
    body: (
      <>
        After each turn, Agora quietly embeds what was said and keeps it in a
        local vector index. The next conversation picks up where you left off —
        semantically, not just by last-seen order.
      </>
    ),
  },
  {
    n: 'V.',
    name: 'Dreaming',
    tag: '~/.agora/dreams/',
    body: (
      <>
        When the app has been idle long enough, a distillation job reads the
        day's log and proposes small edits to your Brand files. Every candidate
        must quote the source verbatim before it's allowed to suggest anything.
        <br />
        <em>You approve.</em> Nothing slips in on its own.
      </>
    ),
  },
];

function Layer({ layer }) {
  const ref = useReveal();
  return (
    <article ref={ref} className="reveal layer">
      <div className="layer-num">{layer.n}</div>
      <div className="layer-name">
        <span>{layer.name}</span>
        <small>{layer.tag}</small>
      </div>
      <div className="layer-body">{layer.body}</div>
    </article>
  );
}

function Inside() {
  const ref = useReveal();
  return (
    <section className="inside" id="inside">
      <div className="container">
        <header ref={ref} className="reveal inside-header">
          <h2 className="section-title">
            Five <em>quiet</em> layers<br />beneath the chat.
          </h2>
          <p className="section-intro">
            Agora is not just a chat window over someone else's API. It is a
            small, personal operating system for your mind — made of five
            on-disk layers, each a plain folder you can back up, diff, or
            delete on a whim.
          </p>
        </header>

        <div className="layers">
          {LAYERS.map((L) => <Layer key={L.n} layer={L} />)}
        </div>
      </div>
    </section>
  );
}

function EverythingLocal() {
  const ref = useReveal();
  return (
    <section className="local" id="local">
      <div className="container">
        <div ref={ref} className="reveal local-grid">
          <div>
            <h2 className="local-title"><em>Everything</em><br />lives on disk.</h2>
            <div className="local-copy">
              <p>
                No server to trust. No account to manage. No cloud lock-in.
                Your conversations, memories, and brand files sit under
                <strong> ~/.agora/</strong> as SQLite and plain text.
              </p>
              <p>
                Back it up with <code>rsync</code>. Diff it with <code>git</code>.
                Clear it with <code>rm</code>. The agent and the archive are
                both yours to hold.
              </p>
            </div>
          </div>
          <div className="filetree" role="img" aria-label="Agora file layout">
            {[
              ['agora.db',     'SQLite: conversations, messages, memory'],
              ['config/',      'Brand layer — SOUL / USER / TOOLS / …'],
              ['wiki/',        'LLM-Wiki pages, auto-maintained'],
              ['raw/',         'Drop inbox for auto-ingest'],
              ['logs/',        'Per-day conversation log'],
              ['dreams/',      'Candidate memories awaiting review'],
              ['skills/',      'Skill packs you can edit by hand'],
              ['workspace/',   'Default root for FS / Bash tools'],
            ].map(([p, g]) => (
              <div className="filetree-row" key={p}>
                <span className="path">{p}</span>
                <span className="gloss">{g}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Install() {
  const ref = useReveal();
  return (
    <section className="install" id="install">
      <div className="container">
        <div ref={ref} className="reveal">
          <h2 className="install-title">
            One <em>right-click</em> away.
          </h2>
          <p className="section-intro">
            The alpha isn't Developer-ID signed yet, so macOS will ask before
            it opens. Thirty seconds total.
          </p>
          <ol className="install-steps">
            <li className="install-step">
              <h4>Download the .dmg</h4>
              <p>
                <a href={DMG_URL}>Agora {VERSION}</a> for Apple Silicon
                (M1 / M2 / M3 / M4) · ~16&nbsp;MB.
              </p>
            </li>
            <li className="install-step">
              <h4>Drag into Applications</h4>
              <p>Open the disk image, drag <code>Agora.app</code> into <code>/Applications</code>.</p>
            </li>
            <li className="install-step">
              <h4>Right-click → Open</h4>
              <p>First launch only. macOS asks once; after that it opens like any other app.</p>
            </li>
          </ol>
          <p className="install-note">
            Intel Mac build isn't packaged yet — you can build from source,
            or <a href={GH_URL + '/issues'} target="_blank" rel="noreferrer">open an issue</a> to
            nudge us.
          </p>
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  const ref = useReveal();
  return (
    <section className="cta">
      <div className="container-narrow" ref={ref}>
        <div className="reveal">
          <h2 className="cta-title">
            One Mac, <em>one home</em><br />for your AI.
          </h2>
          <p className="cta-sub">
            Free and open source. MIT licensed. Your data never leaves the laptop
            unless you explicitly send it.
          </p>
          <div className="cta-buttons">
            <a className="btn btn-primary" href={DMG_URL}>
              <Apple />
              <span>Download Agora</span>
              <ArrowRight />
            </a>
            <a className="btn btn-secondary" href={GH_URL} target="_blank" rel="noreferrer">
              <GitHub />
              <span>Read the source</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-col">
            <h5>Agora</h5>
            <p className="footer-etymology">
              From the ancient Greek <span className="greek">ἀγορά</span> —
              the gathering place where citizens met to argue, trade, and
              keep each other's news. A place to stay in one.
            </p>
          </div>
          <div className="footer-col">
            <h5>Product</h5>
            <a href="#inside">What's inside</a>
            <a href="#local">Everything local</a>
            <a href="#install">Install</a>
            <a href={REL_URL} target="_blank" rel="noreferrer">Releases</a>
          </div>
          <div className="footer-col">
            <h5>Source</h5>
            <a href={GH_URL} target="_blank" rel="noreferrer">GitHub</a>
            <a href={`${GH_URL}/blob/main/CHANGELOG.md`} target="_blank" rel="noreferrer">Changelog</a>
            <a href={`${GH_URL}/blob/main/LICENSE`} target="_blank" rel="noreferrer">License</a>
            <a href={`${GH_URL}/issues`} target="_blank" rel="noreferrer">Issues</a>
          </div>
          <div className="footer-col">
            <h5>Built on</h5>
            <a href="https://tauri.app" target="_blank" rel="noreferrer">Tauri 2</a>
            <a href="https://react.dev" target="_blank" rel="noreferrer">React 19</a>
            <a href="https://www.rust-lang.org" target="_blank" rel="noreferrer">Rust</a>
            <a href="https://www.anthropic.com" target="_blank" rel="noreferrer">Anthropic / OpenAI / Google</a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>MIT © islgl · v{VERSION}</span>
          <div className="footer-bottom-right">
            <span>Made on a Mac, for Macs.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function App() {
  // Initial theme comes from the pre-mount resolver in <head> so the very
  // first React render matches what the DOM already has. No flash.
  const [dark, setDark] = useState(
    () => (typeof window !== 'undefined' && window.__agoraInitialTheme === 'dark')
  );
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    // Only persist when the user toggled manually (i.e. not from ?theme= query),
    // so a verification URL doesn't pollute the next real visit.
    const isQuery = new URLSearchParams(location.search).get('theme');
    if (!isQuery) {
      localStorage.setItem('agora-homepage-theme', dark ? 'dark' : 'light');
    }
  }, [dark]);

  return (
    <>
      <Nav dark={dark} onToggleDark={() => setDark((d) => !d)} />
      <Hero />
      <Whisper />
      <Inside />
      <EverythingLocal />
      <Install />
      <FinalCTA />
      <Footer />
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
