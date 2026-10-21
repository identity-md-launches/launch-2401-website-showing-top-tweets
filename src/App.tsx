import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import {
  ArrowDown,
  ArrowUpRight,
  Bookmark,
  Check,
  ChevronDown,
  CircleHelp,
  Compass,
  Cpu,
  ExternalLink,
  Flame,
  Heart,
  Info,
  MessageCircle,
  Share2,
  Radio,
  Repeat2,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import postData from "./posts.json";

type Post = (typeof postData)[number];
type View = "explore" | "bookmarks";
type Sort = "likes" | "reposts" | "views" | "newest";
const topics = [
  "All tweets",
  "AI agents",
  "Builds",
  "Ecosystem",
  "Community",
] as const;
type Topic = (typeof topics)[number];
const storageKey = "pond-intel-bookmarks-v1";
const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`;
const shortNumber = (n: number) =>
  new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
const postDate = (s: string) =>
  new Date(s).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
const initialView = (): View =>
  window.location.hash === "#bookmarks" ? "bookmarks" : "explore";

function clickedBackdrop(event: MouseEvent<HTMLDialogElement>) {
  const bounds = event.currentTarget.getBoundingClientRect();
  return (
    event.target === event.currentTarget &&
    (event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom)
  );
}

function trapDialogFocus(event: KeyboardEvent<HTMLDialogElement>) {
  if (event.key !== "Tab" || event.ctrlKey || event.metaKey || event.altKey)
    return;
  const controls = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>(
      "button:not(:disabled), a[href], input, select, textarea, summary",
    ),
  ).filter((element) => element.getClientRects().length > 0);
  const first = controls[0];
  const last = controls.at(-1);
  if (event.shiftKey && document.activeElement === first && last) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last && first) {
    event.preventDefault();
    first.focus();
  }
}

function Frog({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      aria-hidden="true"
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 31c0-8 7-14 15-12 5-7 16-5 18 1 10-1 15 5 13 14 4 12-6 19-23 19S5 44 9 31Z" />
      <path d="M14 30h18m4 0h15M18 40c9 6 20 6 29 0M25 27v5m17-5v5" />
    </svg>
  );
}

function Avatar({
  post,
  size = "regular",
}: {
  post: Post;
  size?: "regular" | "small";
}) {
  const [failed, setFailed] = useState(false);
  const avatar =
    post.avatar ||
    postData.find((p) => p.handle === post.handle && p.avatar)?.avatar;
  return (
    <span
      className={`avatar avatar-${size} avatar-${post.handle.toLowerCase()}`}
      aria-hidden="true"
    >
      {avatar && !failed ? (
        <img
          src={asset(avatar)}
          alt=""
          width="44"
          height="44"
          onError={() => setFailed(true)}
        />
      ) : (
        post.author
          .split(" ")
          .map((n) => n[0])
          .slice(0, 2)
          .join("")
      )}
    </span>
  );
}

function HighlightedText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(@\w+|\$IMD|Identity\.md|IdentityMD)/gi).map((part, i) =>
        /^(@|\$|Identity)/i.test(part) ? (
          <span className="mention" key={i}>
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
}

function Tweet({
  post,
  rank,
  saved,
  onSave,
  onShare,
}: {
  post: Post;
  rank: number;
  saved: boolean;
  onSave: (id: string) => void;
  onShare: (post: Post) => void;
}) {
  return (
    <article
      className="tweet"
      data-post-id={post.id}
      aria-label={`Tweet by ${post.author}`}
    >
      <div className="tweet-header">
        <Avatar post={post} />
        <div className="author-block">
          <a
            className="author-name"
            href={`https://x.com/${post.handle}`}
            target="_blank"
            rel="noreferrer"
          >
            {post.author}
            <ArrowUpRight size={13} />
          </a>
          <span className="handle">@{post.handle}</span>
        </div>
        <span className="tweet-rank" aria-label={`Rank ${rank}`}>
          #{String(rank).padStart(2, "0")}
        </span>
        <a
          href={post.url}
          className="x-mark"
          target="_blank"
          rel="noreferrer"
          aria-label={`Open ${post.author}’s tweet on X`}
        >
          𝕏
        </a>
      </div>
      <blockquote aria-label="Tweet excerpt">
        <HighlightedText text={post.excerpt} />
      </blockquote>
      <div className="tweet-meta">
        <button
          className="topic-link"
          type="button"
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent("pond-topic", { detail: post.topic }),
            )
          }
        >
          {post.topic}
        </button>
        <span aria-hidden="true">·</span>
        <time dateTime={new Date(post.date).toISOString()}>
          {postDate(post.date)}
        </time>
        <span
          className="view-count"
          title={`${post.views.toLocaleString()} recorded views`}
        >
          {shortNumber(post.views)} views
        </span>
      </div>
      <div className="tweet-footer">
        <div className="metrics" aria-label="Recorded engagement">
          <span title={`${post.replies} replies`}>
            <MessageCircle size={16} />
            <span>{shortNumber(post.replies)}</span>
            <span className="sr-only"> replies</span>
          </span>
          <span title={`${post.reposts} reposts`}>
            <Repeat2 size={17} />
            <span>{shortNumber(post.reposts)}</span>
            <span className="sr-only"> reposts</span>
          </span>
          <span title={`${post.likes} likes`}>
            <Heart size={16} />
            <span>{shortNumber(post.likes)}</span>
            <span className="sr-only"> likes</span>
          </span>
        </div>
        <div className="tweet-actions">
          <button
            className={`icon-button bookmark-button ${saved ? "is-saved" : ""}`}
            type="button"
            aria-label={`${saved ? "Remove bookmark for" : "Bookmark tweet by"} ${post.author}`}
            aria-pressed={saved}
            title={saved ? "Remove bookmark" : "Bookmark tweet"}
            onClick={() => onSave(post.id)}
          >
            <Bookmark size={18} fill={saved ? "currentColor" : "none"} />
          </button>
          <button
            className="icon-button"
            type="button"
            aria-label={`Share tweet by ${post.author}`}
            title="Share tweet"
            onClick={() => onShare(post)}
          >
            <Share2 size={18} />
          </button>
        </div>
      </div>
      <a
        className="read-tweet"
        aria-label={`Read full tweet by ${post.author} on ${postDate(post.date)}`}
        href={post.url}
        target="_blank"
        rel="noreferrer"
      >
        Read full tweet <ArrowUpRight size={14} />
      </a>
    </article>
  );
}

export default function App() {
  const [view, setView] = useState<View>(initialView);
  const [topic, setTopic] = useState<Topic>("All tweets");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("likes");
  const [month, setMonth] = useState("all");
  const [savedIds, setSavedIds] = useState<string[]>(() => {
    try {
      const stored: unknown = JSON.parse(
        localStorage.getItem(storageKey) || "[]",
      );
      return Array.isArray(stored)
        ? stored.filter(
            (x): x is string =>
              typeof x === "string" && postData.some((p) => p.id === x),
          )
        : [];
    } catch {
      return [];
    }
  });
  const [storageError, setStorageError] = useState(false);
  const [status, setStatus] = useState("");
  const [aboutOpen, setAboutOpen] = useState(false);
  const [sharePost, setSharePost] = useState<Post | null>(null);
  const [copyError, setCopyError] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const shareRef = useRef<HTMLDialogElement>(null);
  const feedRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onHash = () => {
      if (window.location.hash !== "#feed")
        setView(initialView());
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  useEffect(() => {
    const onTopic = (e: Event) => {
      const next = (e as CustomEvent<Topic>).detail;
      if (topics.includes(next)) {
        setTopic(next);
        feedRef.current?.scrollIntoView({
          behavior: "instant",
          block: "start",
        });
      }
    };
    window.addEventListener("pond-topic", onTopic);
    return () => window.removeEventListener("pond-topic", onTopic);
  }, []);
  useEffect(() => {
    if (aboutOpen) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [aboutOpen]);
  useEffect(() => {
    if (sharePost) shareRef.current?.showModal();
    else shareRef.current?.close();
  }, [sharePost]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return postData
      .filter(
        (p) =>
          (view !== "bookmarks" || savedIds.includes(p.id)) &&
          (topic === "All tweets" || p.topic === topic) &&
          (month === "all" ||
            new Date(p.date).getUTCMonth().toString() === month) &&
          (!term ||
            `${p.author} ${p.handle} ${p.excerpt} ${p.topic}`
              .toLowerCase()
              .includes(term)),
      )
      .sort((a, b) =>
        sort === "newest"
          ? new Date(b.date).getTime() - new Date(a.date).getTime()
          : b[sort] - a[sort] ||
            new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
  }, [query, view, topic, sort, month, savedIds]);
  const voices = useMemo(
    () =>
      postData
        .slice()
        .sort((a, b) => b.likes - a.likes)
        .filter(
          (p, i, arr) => arr.findIndex((v) => v.handle === p.handle) === i,
        )
        .slice(0, 4),
    [],
  );
  const totalLikes = postData.reduce((total, p) => total + p.likes, 0);
  const uniqueVoices = new Set(postData.map((p) => p.handle)).size;
  const reset = () => {
    setQuery("");
    setTopic("All tweets");
    setMonth("all");
  };
  const navigate = (next: View) => {
    setView(next);
    reset();
    setStatus("");
    window.location.hash = next;
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const explore = () => {
    navigate("explore");
    feedRef.current?.scrollIntoView({ behavior: "instant", block: "start" });
    searchRef.current?.focus({ preventScroll: true });
  };
  const save = (id: string) => {
    const wasSaved = savedIds.includes(id);
    const next = wasSaved
      ? savedIds.filter((v) => v !== id)
      : [...savedIds, id];
    setSavedIds(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      setStorageError(false);
      setStatus(
        wasSaved ? "Bookmark removed." : "Tweet bookmarked on this device.",
      );
    } catch {
      setStorageError(true);
      setStatus(
        wasSaved
          ? "Bookmark removed for this visit. Browser storage is unavailable."
          : "Bookmarked for this visit. Browser storage is unavailable.",
      );
    }
  };
  const openShare = (post: Post) => {
    setCopyError(false);
    setSharePost(post);
  };
  const copyLink = async () => {
    if (!sharePost) return;
    try {
      await navigator.clipboard.writeText(sharePost.url);
      setStatus("Tweet link copied.");
      setSharePost(null);
    } catch {
      setCopyError(true);
    }
  };

  return (
    <>
      <a href="#feed" className="skip-link">
        Skip to tweets
      </a>
      <aside className="sidebar" aria-label="Site navigation">
        <a
          className="brand"
          href="#explore"
          onClick={() => navigate("explore")}
          aria-label="Pond Intel home"
        >
          <span className="brand-icon">
            <Frog />
          </span>
          <span>
            Pond<span className="brand-light">Intel</span>
            <small>Identity.md, in focus.</small>
          </span>
        </a>
        <nav className="main-nav" aria-label="Main">
          <a
            href="#explore"
            className={view === "explore" ? "selected" : ""}
            aria-current={view === "explore" ? "page" : undefined}
            onClick={() => navigate("explore")}
          >
            <Compass size={20} />
            <span>Explore</span>
            <span className="nav-indicator" />
          </a>
          <a
            href="#bookmarks"
            className={view === "bookmarks" ? "selected" : ""}
            aria-current={view === "bookmarks" ? "page" : undefined}
            onClick={() => navigate("bookmarks")}
          >
            <Bookmark size={20} />
            <span>Bookmarks</span>
            {savedIds.length > 0 && (
              <span className="nav-count">{savedIds.length}</span>
            )}
          </a>
          <button type="button" onClick={() => setAboutOpen(true)}>
            <CircleHelp size={20} />
            <span>About the feed</span>
          </button>
        </nav>
        <div className="sidebar-topics">
          <span className="sidebar-label">Explore the pond</span>
          {topics.slice(1).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                navigate("explore");
                setTopic(t);
                feedRef.current?.scrollIntoView({
                  block: "start",
                  behavior: "instant",
                });
              }}
            >
              <span className="hash">#</span>
              {t}
              <span className="topic-count">
                {postData.filter((p) => p.topic === t).length}
              </span>
            </button>
          ))}
        </div>
        <div className="sidebar-bottom">
          <div className="network-mark">
            <Radio size={17} />
            <span>A community signal</span>
          </div>
          <a href="https://imd.fun" target="_blank" rel="noreferrer">
            Explore Identity.md
            <ArrowUpRight size={16} />
          </a>
          <span className="sidebar-note">
            Independent. Unofficial. Very green.
          </span>
        </div>
      </aside>

      <div className="app-body">
        <header className="topbar">
          <div className="topbar-breadcrumb">
            <span className="mobile-brand">
              <Frog />
              <strong>Pond Intel</strong>
            </span>
            <span className="desktop-breadcrumb">
              The Identity.md conversation
            </span>
          </div>
          <div className="topbar-actions">
            <button
              type="button"
              className="snapshot-button"
              onClick={() => setAboutOpen(true)}
            >
              <span className="status-dot" />
              Community snapshot
              <Info size={14} />
            </button>
            <a
              href="https://x.com/search?q=Identity.md%20OR%20IdentityMD&f=top"
              target="_blank"
              rel="noreferrer"
              className="topbar-x"
              aria-label="Search Identity.md on X"
            >
              𝕏
              <ArrowUpRight size={14} />
            </a>
          </div>
        </header>
        <nav className="mobile-nav" aria-label="Mobile main">
          <a
            href="#explore"
            aria-current={view === "explore" ? "page" : undefined}
            onClick={() => navigate("explore")}
          >
            <Compass size={20} />
            Explore
          </a>
          <a
            href="#bookmarks"
            aria-current={view === "bookmarks" ? "page" : undefined}
            onClick={() => navigate("bookmarks")}
          >
            <Bookmark size={20} />
            Bookmarks{savedIds.length > 0 && <span>{savedIds.length}</span>}
          </a>
          <button type="button" onClick={() => setAboutOpen(true)}>
            <CircleHelp size={20} />
            About
          </button>
        </nav>
        <main>
          <section className="hero" aria-labelledby="hero-title">
            <div className="hero-content">
              <h1 id="hero-title">
                The pond
                <br />
                has <span>signal.</span>
              </h1>
              <p>
                The top tweets about Identity.md,
                <br className="desktop-break" /> all in one place.
              </p>
              <button
                type="button"
                className="primary-button"
                onClick={explore}
              >
                Explore tweets
                <ArrowDown size={17} />
              </button>
            </div>
            <div className="hero-art">
              <img
                src={asset("images/pepe-squad.webp")}
                alt="Three Pepes armed with AI tools, scouting the digital pond."
                width="1200"
                height="800"
                fetchPriority="high"
              />
            </div>
            <span className="art-caption">
              <Cpu size={14} />
              Pepes armed with AI
            </span>
          </section>
          <div className="dashboard-grid">
            <section
              className="feed"
              id="feed"
              ref={feedRef}
              aria-labelledby="feed-title"
              tabIndex={-1}
            >
              <div className="feed-heading">
                <div>
                  <h2 id="feed-title">
                    {view === "bookmarks" ? "Bookmarks" : "From the pond"}
                    <span className="heading-count">
                      {view === "bookmarks" ? savedIds.length : postData.length}
                    </span>
                  </h2>
                  <p>
                    {view === "bookmarks"
                      ? "Good signal, saved for later."
                      : "Big ideas. Real builders. A little frog energy."}
                  </p>
                </div>
                <label className="date-select">
                  <span className="sr-only">Filter by month</span>
                  <select
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                  >
                    <option value="all">All dates</option>
                    <option value="9">October 2026</option>
                    <option value="8">September 2026</option>
                    <option value="7">August 2026</option>
                  </select>
                  <ChevronDown size={14} />
                </label>
              </div>
              <div className="feed-controls">
                <label className="search-box">
                  <Search size={18} />
                  <span className="sr-only">Search tweets or people</span>
                  <input
                    ref={searchRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search tweets…"
                    type="search"
                    autoComplete="off"
                    name="tweet-search"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => {
                        setQuery("");
                        searchRef.current?.focus();
                      }}
                      aria-label="Clear search"
                    >
                      <X size={16} />
                    </button>
                  )}
                </label>
                <label className="sort-select">
                  <span className="sr-only">Sort tweets</span>
                  <Flame size={17} />
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as Sort)}
                  >
                    <option value="likes">Most liked</option>
                    <option value="reposts">Most reposted</option>
                    <option value="views">Most viewed</option>
                    <option value="newest">Newest first</option>
                  </select>
                  <ChevronDown size={14} />
                </label>
              </div>
              <div
                className="topic-filters"
                role="group"
                aria-label="Filter tweets by topic"
              >
                {topics.map((t) => (
                  <button
                    type="button"
                    key={t}
                    className={topic === t ? "active" : ""}
                    aria-pressed={topic === t}
                    onClick={() => setTopic(t)}
                  >
                    {t === "All tweets" && <Sparkles size={14} />}
                    {t}
                  </button>
                ))}
              </div>
              <div className="feed-caption">
                <span role="status" aria-live="polite">
                  {filtered.length} {filtered.length === 1 ? "tweet" : "tweets"}
                  {query.trim() && <> matching “{query.trim()}”</>}
                </span>
                <button type="button" onClick={() => setAboutOpen(true)}>
                  Snapshot · Oct 21, 2026
                  <Info size={13} />
                </button>
              </div>
              {view === "bookmarks" && (
                <p className="storage-note">
                  {storageError
                    ? "Storage is unavailable. Bookmarks last for this visit only."
                    : "Bookmarks are saved in this browser, on this device."}
                </p>
              )}
              <div className="tweet-list">
                {filtered.map((p, i) => (
                  <Tweet
                    key={p.id}
                    post={p}
                    rank={i + 1}
                    saved={savedIds.includes(p.id)}
                    onSave={save}
                    onShare={openShare}
                  />
                ))}
              </div>
              {filtered.length === 0 && (
                <div className="empty-state">
                  {view === "bookmarks" && !savedIds.length ? (
                    <Bookmark size={30} />
                  ) : (
                    <Search size={30} />
                  )}
                  <h3>
                    {view === "bookmarks" && !savedIds.length
                      ? "Keep the good signal."
                      : "No tweets found"}
                  </h3>
                  <p>
                    {view === "bookmarks" && !savedIds.length
                      ? "Bookmark a tweet to find it here next time."
                      : "Try another search or clear the filters to see the pond again."}
                  </p>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => {
                      if (view === "bookmarks" && !savedIds.length)
                        navigate("explore");
                      else reset();
                    }}
                  >
                    {view === "bookmarks" && !savedIds.length
                      ? "Explore tweets"
                      : "Clear filters"}
                    <ArrowUpRight size={16} />
                  </button>
                </div>
              )}
              {filtered.length > 0 && (
                <div className="feed-end">
                  <Frog />
                  <p>You’re all caught up with this snapshot.</p>
                  <a
                    href="https://x.com/search?q=Identity.md%20OR%20IdentityMD&f=live"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Find the latest on X<ArrowUpRight size={15} />
                  </a>
                </div>
              )}
            </section>
            <aside className="right-rail" aria-label="Community context">
              <section className="pond-overview">
                <h2>
                  Inside this snapshot
                  <Radio size={18} />
                </h2>
                <div className="overview-stats">
                  <div>
                    <strong>{postData.length}</strong>
                    <span>Tweets</span>
                  </div>
                  <div>
                    <strong>{uniqueVoices}</strong>
                    <span>Voices</span>
                  </div>
                  <div>
                    <strong>{shortNumber(totalLikes)}</strong>
                    <span>Likes</span>
                  </div>
                </div>
                <p>Recorded engagement, not a live feed.</p>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setAboutOpen(true)}
                >
                  How this feed works
                  <ArrowUpRight size={14} />
                </button>
              </section>
              <section className="voices">
                <h2>Voices in the pond</h2>
                <p>The people behind the conversation.</p>
                <div>
                  {voices.map((p) => (
                    <a
                      className="voice"
                      key={p.handle}
                      href={`https://x.com/${p.handle}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Avatar post={p} size="small" />
                      <span>
                        <strong>{p.author}</strong>
                        <small>@{p.handle}</small>
                      </span>
                      <ArrowUpRight size={16} />
                    </a>
                  ))}
                </div>
              </section>
              <section className="network-card">
                <div className="network-art">
                  <Frog />
                  <Cpu className="network-chip" size={24} />
                </div>
                <h2>Meet Identity.md</h2>
                <p>
                  A community of builders and AI agents. See what’s happening
                  beyond the feed.
                </p>
                <a href="https://imd.fun" target="_blank" rel="noreferrer">
                  Explore the network
                  <ArrowUpRight size={16} />
                </a>
              </section>
              <div className="rail-footer">
                <button type="button" onClick={() => setAboutOpen(true)}>
                  About & sources
                </button>
                <span>Made for the pond.</span>
                <span>Not affiliated with X or Identity.md.</span>
              </div>
            </aside>
          </div>
        </main>
        <footer className="mobile-footer">
          <button type="button" onClick={() => setAboutOpen(true)}>
            About & sources
            <ArrowUpRight size={14} />
          </button>
          <span>Made for the pond.</span>
        </footer>
      </div>
      <div className="toast" role="status" aria-live="polite">
        {status && (
          <>
            <Check size={16} />
            {status}
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => setStatus("")}
            >
              <X size={16} />
            </button>
          </>
        )}
      </div>
      <dialog
        ref={dialogRef}
        className="modal"
        onKeyDown={trapDialogFocus}
        onCancel={() => setAboutOpen(false)}
        onClose={() => setAboutOpen(false)}
        onClick={(e) => {
          if (clickedBackdrop(e)) setAboutOpen(false);
        }}
        aria-labelledby="about-title"
      >
        <div className="modal-heading">
          <h2 id="about-title">About the feed</h2>
          <button
            type="button"
            className="icon-button"
            autoFocus
            onClick={() => setAboutOpen(false)}
            aria-label="Close about the feed"
          >
            <X size={20} />
          </button>
        </div>
        <p>
          Pond Intel collects public tweets about Identity.md and its community.
          This is an independent, unofficial reading room.
        </p>
        <h3>A snapshot, with sources</h3>
        <p>
          These {postData.length} tweets were checked on October 21, 2026. “Most
          liked” ranks only the included tweets by recorded likes. The
          collection is selective, not a complete ranking of X.
        </p>
        <p>
          Excerpts keep the authors’ words. Dates refer to the original posts;
          likes, replies, reposts, and views are snapshots retrieved through
          FxTwitter. They do not update automatically.
        </p>
        <h3>Your bookmarks stay here</h3>
        <p>
          Bookmarks live in this browser’s local storage. They are not shared
          with other people or synced to X. No account is needed.
        </p>
        <details>
          <summary>View the {postData.length} original sources</summary>
          <ul className="source-list">
            {postData.map((p) => (
              <li key={p.id}>
                <a href={p.url} target="_blank" rel="noreferrer">
                  {p.author} · {postDate(p.date)}
                  <ExternalLink size={14} />
                </a>
                <a
                  href={p.source}
                  target="_blank"
                  rel="noreferrer"
                  className="source-data"
                >
                  Recorded data
                  <ArrowUpRight size={13} />
                </a>
              </li>
            ))}
          </ul>
        </details>
        <div className="modal-footnote">
          Artwork created with AI. Pepe is a character by Matt Furie. Tweet
          excerpts belong to their respective authors.
        </div>
      </dialog>
      <dialog
        ref={shareRef}
        className="modal share-modal"
        onKeyDown={trapDialogFocus}
        onCancel={() => setSharePost(null)}
        onClose={() => setSharePost(null)}
        onClick={(e) => {
          if (clickedBackdrop(e)) setSharePost(null);
        }}
        aria-labelledby="share-title"
      >
        <div className="modal-heading">
          <h2 id="share-title">Share this tweet</h2>
          <button
            type="button"
            className="icon-button"
            onClick={() => setSharePost(null)}
            aria-label="Close share tweet"
          >
            <X size={20} />
          </button>
        </div>
        {sharePost && (
          <>
            <p>Send {sharePost.author}’s original post to a fellow Pepe.</p>
            <label className="share-label" htmlFor="share-link">
              Original tweet link
            </label>
            <input
              id="share-link"
              className="share-input"
              readOnly
              value={sharePost.url}
              onFocus={(e) => e.currentTarget.select()}
            />
            {copyError && (
              <p className="copy-help" role="status">
                Copy isn’t available in this browser. Select the link above and
                copy it manually.
              </p>
            )}
            <div className="share-actions">
              <button
                type="button"
                className="primary-button"
                onClick={copyLink}
              >
                Copy link
                <Check size={16} />
              </button>
              <a
                className="secondary-button"
                href={`https://x.com/intent/tweet?url=${encodeURIComponent(sharePost.url)}`}
                target="_blank"
                rel="noreferrer"
              >
                Share on X<ArrowUpRight size={16} />
              </a>
            </div>
          </>
        )}
      </dialog>
    </>
  );
}
