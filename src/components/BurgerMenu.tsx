import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useProjects, useCurrentUser } from "@/hooks/useSupabaseProject";
import { useProjectContext } from "@/contexts/DemoProjectContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import i18n from "@/i18n/index";

const LANG_KEY = "cmnt_language";
const OPEN_KEY = "cmnt_burger_open";

export function BurgerMenu() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { data: projects = [] } = useProjects();
  const { data: currentUser } = useCurrentUser();
  const { setCurrentProjectId } = useProjectContext();
  const queryClient = useQueryClient();

  const isProjectRoute = location.pathname.startsWith("/project");

  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return isProjectRoute && sessionStorage.getItem(OPEN_KEY) === "1";
  });
  const [editingName, setEditingName] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [activeLang, setActiveLang] = useState<string>(
    () => localStorage.getItem(LANG_KEY) ?? i18n.language.slice(0, 2) ?? "en"
  );
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);

  // Persist open state; auto-close when leaving project routes
  useEffect(() => {
    if (!isProjectRoute && open) {
      setOpen(false);
      sessionStorage.removeItem(OPEN_KEY);
      return;
    }
    if (isProjectRoute) {
      sessionStorage.setItem(OPEN_KEY, open ? "1" : "0");
    }
  }, [open, isProjectRoute, location.pathname]);

  // Outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Escape-to-close + focus trap
  useEffect(() => {
    if (!open) return;
    previouslyFocusedRef.current = document.activeElement as HTMLElement;

    // Focus first focusable in panel
    const focusables = () =>
      panelRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
    const list = focusables();
    list?.[0]?.focus();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        return;
      }
      if (e.key === "Tab") {
        const items = focusables();
        if (!items || items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      previouslyFocusedRef.current?.focus?.();
    };
  }, [open]);

  useEffect(() => {
    const stored = localStorage.getItem(LANG_KEY);
    if (stored) setActiveLang(stored);
  }, []);

  const handleLang = (lang: string) => {
    setActiveLang(lang);
    localStorage.setItem(LANG_KEY, lang);
    i18n.changeLanguage(lang);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setOpen(false);
    navigate("/auth");
  };

  const handleSaveName = async () => {
    if (!displayName.trim() || !currentUser) return;
    setSavingName(true);
    await supabase.auth.updateUser({ data: { display_name: displayName.trim() } });
    setSavingName(false);
    setEditingName(false);
  };

  const go = (path: string) => {
    // Only auto-close when navigating away from project routes
    if (!path.startsWith("/project")) setOpen(false);
    navigate(path);
  };

  const handleExploreDemo = async () => {
    setDemoLoading(true);
    setOpen(false);
    try {
      const { data, error } = await supabase.functions.invoke("seed-demo-project");
      if (error) throw error;
      await queryClient.invalidateQueries();
      queryClient.clear();
      setCurrentProjectId(data.project_id);
      navigate("/project/dashboard");
      toast.success("Demo project loaded");
    } catch (err) {
      console.error("Demo seed error:", err);
      toast.error("Failed to load demo");
    } finally {
      setDemoLoading(false);
    }
  };

  const HIDDEN_ROUTES = ["/auth", "/forgot-password", "/reset-password", "/unsubscribe"];
  const isHidden = HIDDEN_ROUTES.some(
    (path) => location.pathname === path || location.pathname.startsWith(`${path}/`)
  );
  if (isHidden) return null;

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  const itemClass = (path: string) =>
    `group relative w-full text-left font-mono text-[13px] py-2 pl-4 transition-colors ${
      isActive(path) ? "text-accent" : "text-foreground hover:text-accent"
    }`;

  const ActiveMarker = ({ path }: { path: string }) => (
    <span
      aria-hidden="true"
      className={`absolute left-0 top-1/2 -translate-y-1/2 h-1 w-[2px] ${
        isActive(path) ? "bg-accent" : "bg-transparent"
      }`}
    />
  );

  return (
    <>
      {/* Hamburger trigger */}
      <button
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        className="fixed top-0 right-0 z-50 p-3 flex flex-col gap-[5px] items-end focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        aria-label={open ? t("menu.close") || "Close menu" : t("menu.open") || "Open menu"}
        aria-expanded={open}
        aria-controls="burger-menu-panel"
        aria-haspopup="dialog"
      >
        <span className="block w-5 h-px bg-foreground" aria-hidden="true" />
        <span className="block w-5 h-px bg-foreground" aria-hidden="true" />
        <span className="block w-5 h-px bg-foreground" aria-hidden="true" />
      </button>

      {open && <div className="fixed inset-0 z-50 bg-black/20" aria-hidden="true" />}

      <div
        id="burger-menu-panel"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="burger-menu-title"
        aria-hidden={!open}
        className={`fixed top-0 right-0 h-full z-50 w-[300px] bg-surface-cream border-l border-hairline flex flex-col transition-transform duration-200 ${
          open ? "translate-x-0" : "translate-x-full pointer-events-none"
        }`}
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex items-center justify-between px-5 h-14 border-b border-hairline">
          <span id="burger-menu-title" className="t-title">
            {t("menu.title")}
          </span>
          <button
            onClick={() => setOpen(false)}
            className="w-8 h-8 flex items-center justify-center border border-hairline font-mono text-[14px] text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
            aria-label={t("menu.close") || "Close menu"}
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-5 py-4 space-y-6" aria-label={t("menu.title")}>
          {/* PROJECT NAV (only on project routes) */}
          {isProjectRoute && (
            <section aria-labelledby="menu-section-nav">
              <p id="menu-section-nav" className="t-eyebrow mb-2">
                {t("menu.navigation") || "Navigation"}
              </p>
              {[
                { path: "/project/dashboard", label: t("nav.dashboard") || "Dashboard" },
                { path: "/project/milestones", label: t("nav.milestones") || "Milestones" },
                { path: "/project/evidence", label: t("nav.evidence") || "Evidence" },
                { path: "/project/payments", label: t("nav.payments") || "Payments" },
                { path: "/project/team", label: t("nav.team") || "Team" },
                { path: "/project/activity", label: t("nav.activity") || "Activity" },
              ].map((item) => (
                <button
                  key={item.path}
                  onClick={() => go(item.path)}
                  className={itemClass(item.path)}
                  aria-current={isActive(item.path) ? "page" : undefined}
                >
                  <ActiveMarker path={item.path} />
                  {item.label}
                </button>
              ))}
            </section>
          )}

          {/* PROJECTS */}
          <section aria-labelledby="menu-section-projects">
            <p
              id="menu-section-projects"
              className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mb-2"
            >
              {t("menu.projects")}
            </p>
            <button
              onClick={() => go("/create-project")}
              className={itemClass("/create-project")}
              aria-current={isActive("/create-project") ? "page" : undefined}
            >
              {t("project.new_project")}
            </button>
            {projects.length > 1 && (
              <button
                onClick={() => go("/")}
                className={itemClass("/")}
                aria-current={location.pathname === "/" ? "page" : undefined}
              >
                {t("project.switch_project")}
              </button>
            )}
          </section>

          {/* ACCOUNT */}
          <section aria-labelledby="menu-section-account">
            <p
              id="menu-section-account"
              className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mb-2"
            >
              {t("menu.account")}
            </p>
            {currentUser?.email && (
              <p className="font-mono text-[11px] text-muted-foreground py-1">{currentUser.email}</p>
            )}
            {editingName ? (
              <div className="space-y-2 mt-2">
                <label className="sr-only" htmlFor="display-name-input">
                  {t("menu.display_name")}
                </label>
                <input
                  id="display-name-input"
                  autoFocus
                  className="w-full bg-secondary border border-border rounded px-3 py-1.5 font-mono text-[13px] text-foreground"
                  placeholder={t("menu.display_name")}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Escape") setEditingName(false); }}
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleSaveName}
                    disabled={savingName}
                    className="font-mono text-[12px] text-foreground border border-foreground rounded px-3 py-1"
                    aria-label={t("common.save")}
                  >
                    {savingName ? t("common.loading") : t("common.save")}
                  </button>
                  <button
                    onClick={() => setEditingName(false)}
                    className="font-mono text-[12px] text-muted-foreground"
                    aria-label={t("common.cancel")}
                  >
                    {t("common.cancel")}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  setDisplayName(currentUser?.user_metadata?.display_name ?? "");
                  setEditingName(true);
                }}
                className="w-full text-left font-mono text-[13px] text-foreground py-2 hover:text-accent transition-colors"
                aria-label={t("menu.profile_settings")}
              >
                {t("menu.profile_settings")}
              </button>
            )}
          </section>

          {/* PREFERENCES */}
          <section aria-labelledby="menu-section-prefs">
            <p
              id="menu-section-prefs"
              className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mb-2"
            >
              {t("menu.preferences")}
            </p>
            <p id="lang-group-label" className="font-mono text-[11px] text-muted-foreground mb-2">
              {t("menu.language")}
            </p>
            <div className="flex gap-2" role="group" aria-labelledby="lang-group-label">
              {(["en", "it"] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => handleLang(lang)}
                  aria-pressed={activeLang === lang}
                  aria-label={`${t("menu.language")}: ${lang.toUpperCase()}`}
                  className={`font-mono text-[13px] px-3 py-1 rounded transition-colors ${
                    activeLang === lang
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground border border-border"
                  }`}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>
          </section>

          {/* SUPPORT */}
          <section aria-labelledby="menu-section-support">
            <p
              id="menu-section-support"
              className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mb-2"
            >
              {t("menu.support")}
            </p>
            <button
              onClick={handleExploreDemo}
              disabled={demoLoading}
              className="w-full text-left font-mono text-[13px] text-foreground py-2 hover:text-accent transition-colors disabled:opacity-50"
              aria-label={t("auth.explore_demo")}
            >
              {demoLoading ? "loading demo..." : t("auth.explore_demo")}
            </button>
            <button
              onClick={handleSignOut}
              className="w-full text-left font-mono text-[13px] text-muted-foreground py-2 hover:text-foreground transition-colors"
              aria-label={t("auth.sign_out")}
            >
              {t("auth.sign_out")}
            </button>
          </section>
        </nav>
      </div>
    </>
  );
}
