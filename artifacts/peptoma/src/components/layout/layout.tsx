import { ReactNode, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { WalletButton } from "@/components/ui/wallet-button";
import { SearchOverlay } from "@/components/ui/search-overlay";
import { Activity, Dna, List, Rocket, Coins, Bot, Github, BookOpen, Twitter, Network, Menu, X, ChevronRight, MessageSquare, FlaskConical, Microscope, Package, Trophy, Vote, ChevronDown, Search, Store } from "lucide-react";

const desktopLinks = [
  { href: "/", label: "Home", icon: Activity },
  { href: "/lab", label: "The Lab", icon: FlaskConical },
  { href: "/feed", label: "Feed", icon: List },
  { href: "/copilot", label: "Copilot", icon: MessageSquare },
  { href: "/missions", label: "Missions", icon: Rocket },
  { href: "/token", label: "$PEPTM", icon: Coins },
  { href: "/events",    label: "Events",    icon: Trophy },
];

const links = [
  { href: "/", label: "Home", icon: Activity },
  { href: "/peptides", label: "Peptides", icon: Dna },
  { href: "/governance", label: "Governance", icon: Vote },
  { href: "/lab", label: "The Lab", icon: FlaskConical },
  { href: "/feed", label: "Feed", icon: List },
  { href: "/marketplace", label: "IP-NFT Marketplace", icon: Coins },
  { href: "/copilot", label: "Copilot", icon: MessageSquare },
  { href: "/missions", label: "Missions", icon: Rocket },
  { href: "/token", label: "$PEPTM Token", icon: Coins },
  { href: "/events",    label: "Events",    icon: Trophy },
  { href: "/science", label: "Science", icon: Microscope },
  { href: "/agents", label: "For Agents", icon: Bot },
];

function useCurrentTime() {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [location] = useLocation();

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-background/80 backdrop-blur-sm transition-opacity duration-200",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />
      {/* Drawer */}
      <div
        className={cn(
          "fixed top-0 right-0 z-50 h-full w-72 bg-card border-l border-border shadow-2xl flex flex-col transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 h-14 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <img src={`${import.meta.env.BASE_URL}logo.png`} alt="PEPTOMA" className="w-5 h-5 object-contain" />
            <span className="font-mono font-bold tracking-[0.18em] text-sm">PEPTOMA</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = link.href === "/" ? location === "/" : location.startsWith(link.href);
            return (
              <Link key={link.href} href={link.href}>
                <div
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-mono cursor-pointer transition-all",
                    isActive
                      ? "bg-[hsl(var(--peptoma-cyan))/10] text-[hsl(var(--peptoma-cyan))] border border-[hsl(var(--peptoma-cyan))/25]"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-[hsl(var(--peptoma-cyan))]" : "")} />
                  <span className="flex-1">{link.label}</span>
                  {isActive
                    ? <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--peptoma-cyan))] animate-pulse" />
                    : <ChevronRight className="w-3.5 h-3.5 opacity-30" />
                  }
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Drawer footer */}
        <div className="border-t border-border px-5 py-4 shrink-0 space-y-3">
          {/* Wallet button in mobile drawer */}
          <WalletButton size="md" className="w-full justify-center" />
          <div className="flex items-center gap-3">
            <a href="https://github.com/peptoma" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors">
              <Github className="w-3.5 h-3.5" /> GitHub
            </a>
            <a href="https://x.com/Peptoma_xyz" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors">
              <Twitter className="w-3.5 h-3.5" /> X
            </a>
            <Link href="/docs">
              <div onClick={onClose} className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                <BookOpen className="w-3.5 h-3.5" /> Docs
              </div>
            </Link>
            <Link href="/sdk">
              <div onClick={onClose} className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                <Package className="w-3.5 h-3.5" /> SDK
              </div>
            </Link>
          </div>
          <p className="text-[10px] font-mono text-muted-foreground/50">peptoma.xyz · Open DeSci</p>
        </div>
      </div>
    </>
  );
}

function PeptidesDropdown({ location }: { location: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isPeptidesActive = location.startsWith("/peptides");
  const isGovActive = location.startsWith("/governance");
  const isMarketActive = location.startsWith("/marketplace");
  const isActive = isPeptidesActive || isGovActive || isMarketActive;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          "flex items-center gap-1 px-2.5 py-1.5 rounded-sm text-[11px] font-mono transition-all cursor-pointer whitespace-nowrap",
          isActive
            ? "bg-[hsl(var(--peptoma-cyan))/10] text-[hsl(var(--peptoma-cyan))] border border-[hsl(var(--peptoma-cyan))/25]"
            : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
        )}
      >
        <Dna className={cn("w-3 h-3 shrink-0", isActive ? "text-[hsl(var(--peptoma-cyan))]" : "")} />
        Peptides
        <ChevronDown className={cn("w-2.5 h-2.5 transition-transform duration-200", open ? "rotate-180" : "")} />
        {isActive && <span className="w-1 h-1 rounded-full bg-[hsl(var(--peptoma-cyan))] animate-pulse ml-0.5 shadow-[0_0_6px_hsl(145_100%_42%/0.9)]" />}
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-48 rounded-lg border border-border bg-card/95 backdrop-blur-xl shadow-xl z-50 overflow-hidden py-1">
          <Link href="/peptides" onClick={() => setOpen(false)}>
            <div className={cn(
              "flex items-center gap-2 px-3 py-2 text-[11px] font-mono cursor-pointer transition-colors",
              isPeptidesActive ? "text-[hsl(var(--peptoma-cyan))] bg-[hsl(var(--peptoma-cyan))/8]" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
            )}>
              <Dna className="w-3 h-3 shrink-0" />
              Peptide Library
              {isPeptidesActive && <span className="w-1 h-1 rounded-full bg-[hsl(var(--peptoma-cyan))] animate-pulse ml-auto" />}
            </div>
          </Link>
          <Link href="/marketplace" onClick={() => setOpen(false)}>
            <div className={cn(
              "flex items-center gap-2 px-3 py-2 text-[11px] font-mono cursor-pointer transition-colors",
              isMarketActive ? "text-[hsl(var(--peptoma-cyan))] bg-[hsl(var(--peptoma-cyan))/8]" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
            )}>
              <Store className="w-3 h-3 shrink-0" />
              Marketplace
              {isMarketActive && <span className="w-1 h-1 rounded-full bg-[hsl(var(--peptoma-cyan))] animate-pulse ml-auto" />}
            </div>
          </Link>
          <Link href="/governance" onClick={() => setOpen(false)}>
            <div className={cn(
              "flex items-center gap-2 px-3 py-2 text-[11px] font-mono cursor-pointer transition-colors",
              isGovActive ? "text-[hsl(var(--peptoma-cyan))] bg-[hsl(var(--peptoma-cyan))/8]" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
            )}>
              <Vote className="w-3 h-3 shrink-0" />
              Governance
              {isGovActive && <span className="w-1 h-1 rounded-full bg-[hsl(var(--peptoma-cyan))] animate-pulse ml-auto" />}
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}

function TopNav({ hidden, onSearchOpen }: { hidden: boolean; onSearchOpen: () => void }) {
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const now = useCurrentTime();

  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: "UTC" });
  const dateStr = now.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric", timeZone: "UTC" }).toUpperCase();

  const currentPage = links.find(l => l.href !== "/" ? location.startsWith(l.href) : location === "/");

  // Close menu when route changes
  useEffect(() => { setMenuOpen(false); }, [location]);

  return (
    <>
      <header className={cn(
        "h-11 border-b border-border bg-card/95 backdrop-blur-xl sticky top-0 z-50 flex items-center px-4 sm:px-5 gap-0",
        "transition-transform duration-300 ease-in-out",
        hidden ? "-translate-y-full" : "translate-y-0"
      )}>
        {/* Logo */}
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer group shrink-0 mr-3 sm:mr-5">
            <img
              src={`${import.meta.env.BASE_URL}logo.png`}
              alt="PEPTOMA"
              className="w-7 h-7 object-contain group-hover:scale-105 transition-transform"
            />
            <span className="font-mono font-bold tracking-[0.18em] text-sm text-foreground">PEPTOMA</span>
          </div>
        </Link>

        {/* Divider (desktop) */}
        <div className="hidden lg:block w-px h-4 bg-border shrink-0 mr-3" />

        {/* Desktop nav links */}
        <nav className="hidden lg:flex items-center gap-px flex-1 min-w-0">
          {/* Peptides dropdown */}
          <PeptidesDropdown location={location} />
          {desktopLinks.map((link) => {
            const Icon = link.icon;
            const isActive = link.href === "/" ? location === "/" : location.startsWith(link.href);
            return (
              <Link key={link.href} href={link.href}>
                <div className={cn(
                  "flex items-center gap-1 px-2.5 py-1.5 rounded-sm text-[11px] font-mono transition-all cursor-pointer whitespace-nowrap",
                  isActive
                    ? "bg-[hsl(var(--peptoma-cyan))/10] text-[hsl(var(--peptoma-cyan))] border border-[hsl(var(--peptoma-cyan))/25]"
                    : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
                )}>
                  <Icon className={cn("w-3 h-3 shrink-0", isActive ? "text-[hsl(var(--peptoma-cyan))]" : "")} />
                  {link.label}
                  {isActive && (
                    <span className="w-1 h-1 rounded-full bg-[hsl(var(--peptoma-cyan))] animate-pulse ml-0.5 shadow-[0_0_6px_hsl(145_100%_42%/0.9)]" />
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Mobile: current page label */}
        <div className="flex lg:hidden flex-1 items-center">
          {currentPage && (
            <span className="text-xs font-mono text-muted-foreground truncate">
              {currentPage.href !== "/" ? currentPage.label.toUpperCase() : ""}
            </span>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto">
          {/* LIVE badge */}
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-[hsl(var(--peptoma-cyan))] bg-[hsl(var(--peptoma-cyan))/8] border border-[hsl(var(--peptoma-cyan))/25] px-2 py-0.5 rounded-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--peptoma-cyan))] animate-pulse shadow-[0_0_5px_hsl(145_100%_42%/0.9)]" />
            LIVE
          </div>
          {/* Date/time */}
          <div className="text-[10px] font-mono text-muted-foreground tracking-wide hidden md:block">
            {dateStr} • {timeStr} UTC
          </div>
          {/* System status */}
          <div className="text-[10px] font-mono text-[hsl(var(--peptoma-cyan))/60] border border-[hsl(var(--peptoma-cyan))/20] px-2 py-0.5 rounded-sm hidden xl:block">
            ALL SYSTEMS NOMINAL
          </div>
          {/* Search button */}
          <button
            onClick={() => onSearchOpen()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm border border-border/60 text-muted-foreground hover:text-foreground hover:border-border hover:bg-foreground/5 transition-all"
            aria-label="Search"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden lg:inline text-[11px] font-mono">Search</span>
            <kbd className="hidden xl:inline text-[9px] font-mono px-1 py-0.5 rounded bg-muted border border-border text-muted-foreground">⌘K</kbd>
          </button>
          {/* Global wallet button */}
          <div className="hidden lg:block">
            <WalletButton />
          </div>
          {/* Hamburger (mobile only) */}
          <button
            onClick={() => setMenuOpen(true)}
            className="lg:hidden p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>
      </header>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}

function Footer() {
  return (
    <footer className="relative z-10 border-t border-border/60 bg-card/80 backdrop-blur-sm mt-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Top row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 pb-6 border-b border-border/40">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <img
                src={`${import.meta.env.BASE_URL}logo.png`}
                alt="PEPTOMA"
                className="w-6 h-6 object-contain"
              />
              <span className="font-mono font-bold tracking-[0.18em] text-sm text-foreground">PEPTOMA</span>
            </div>
            <p className="text-[11px] font-mono text-muted-foreground leading-relaxed max-w-[200px]">
              Open DeSci platform for peptide research. Powered by community, secured on Solana.
            </p>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--peptoma-cyan))] animate-pulse" />
              <span className="text-[10px] font-mono text-[hsl(var(--peptoma-cyan))]">peptoma.xyz</span>
            </div>
          </div>

          {/* Platform links */}
          <div className="space-y-3">
            <p className="text-[9px] font-mono text-muted-foreground/60 tracking-[0.2em] uppercase">Platform</p>
            <div className="space-y-1.5">
              {[
                { href: "/peptides", label: "Peptide Library", icon: Dna },
                { href: "/lab", label: "The Lab", icon: FlaskConical },
                { href: "/feed", label: "Research Feed", icon: Activity },
                { href: "/copilot", label: "Copilot", icon: MessageSquare },
                { href: "/missions", label: "Mission Control", icon: Rocket },
                { href: "/token", label: "$PEPTOMA Token", icon: Coins },
                { href: "/ecosystem", label: "Ecosystem", icon: Network },
              ].map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href}>
                  <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors cursor-pointer group">
                    <Icon className="w-3 h-3 shrink-0 group-hover:text-[hsl(var(--peptoma-cyan))] transition-colors" />
                    {label}
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Resources + Social */}
          <div className="space-y-3">
            <p className="text-[9px] font-mono text-muted-foreground/60 tracking-[0.2em] uppercase">Resources</p>
            <div className="space-y-1.5">
              <Link href="/docs">
                <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors cursor-pointer group">
                  <BookOpen className="w-3 h-3 shrink-0 group-hover:text-[hsl(var(--peptoma-cyan))] transition-colors" />
                  Documentation
                </div>
              </Link>
              <Link href="/sdk">
                <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors cursor-pointer group">
                  <Package className="w-3 h-3 shrink-0 group-hover:text-[hsl(var(--peptoma-cyan))] transition-colors" />
                  SDK (npm)
                </div>
              </Link>
              <Link href="/agents">
                <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors cursor-pointer group">
                  <Bot className="w-3 h-3 shrink-0 group-hover:text-[hsl(var(--peptoma-cyan))] transition-colors" />
                  Agent API
                </div>
              </Link>
            </div>
            <div className="pt-2 space-y-1.5">
              <p className="text-[9px] font-mono text-muted-foreground/60 tracking-[0.2em] uppercase">Community</p>
              <div className="flex items-center gap-3">
                <a href="https://github.com/peptoma" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors group">
                  <Github className="w-3.5 h-3.5 group-hover:text-[hsl(var(--peptoma-cyan))] transition-colors" />
                  GitHub
                </a>
                <a href="https://x.com/Peptoma_xyz" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors group">
                  <Twitter className="w-3.5 h-3.5 group-hover:text-[hsl(var(--peptoma-cyan))] transition-colors" />
                  X / Twitter
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div className="pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p className="text-[10px] font-mono text-muted-foreground/50">
            © {new Date().getUTCFullYear()} Peptoma. Open DeSci. All research is publicly verifiable.
          </p>
          <p className="text-[10px] font-mono text-muted-foreground/40">
            Built on Solana · Powered by PEPTOMA AI Engine
          </p>
        </div>
      </div>
    </footer>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const [navHidden, setNavHidden] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const lastScrollY = useRef(0);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const onScroll = () => {
      const y = el.scrollTop;
      const delta = y - lastScrollY.current;
      if (delta > 6 && y > 50) setNavHidden(true);
      else if (delta < -6) setNavHidden(false);
      lastScrollY.current = y;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(o => !o);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col overflow-hidden">
      <TopNav hidden={navHidden} onSearchOpen={() => setSearchOpen(true)} />
      <main ref={mainRef} className="flex-1 overflow-y-auto relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 relative z-10">
          {children}
        </div>
        <Footer />
      </main>
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}

export function Sidebar() {
  return null;
}
