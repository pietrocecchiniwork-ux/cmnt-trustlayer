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

  const [open, setOpen] = useState<boolean>(false);
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

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);


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

  useEffect(() => {
    if (!open) return;
    previouslyFocusedRef.current = document.activeElement as HTMLElement;
    const focusables = () =>
      panelRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
    focusables()?.[0]?.focus();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); setOpen(false); return; }
      if (e.key === "Tab") {
        const items = focusables();
        if (!items || items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
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

  const itemBase = "w-full text-left rounded-full font-sans text-[14px] py-2.5 px-4 transition-colors";
  const itemClass = (path: string) =>
    `${itemBase} ${isActive(path) ? "bg-secondary text-foreground" : "text-foreground/70 hover:bg-secondary/60 hover:text-foreground"}`;

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        className="fixed top-3 right-3 z-50 w-10 h-10 rounded-full bg-card flex flex-col gap-[5px] items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-transform active:scale-95"
        aria-label={open ? t("menu.close") || "Close menu" : t("menu.open") || "Open menu"}
        aria-expanded={open}
        aria-controls="burger-menu-panel"
        aria-haspopup="dialog"
      >
        <span className="block w-4 h-px bg-foreground" aria-hidden="true" />
        <span className="block w-4 h-px bg-foreground" aria-hidden="true" />
        <span className="block w-4 h-px bg-foreground" aria-hidden="true" />
      </button>

      {open && <div className="fixed inset-0 z-40 bg-black/30" aria-hidden="true" />}

      <div
        id="burger-menu-panel"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="burger-menu-title"
        aria-hidden={!open}
        className={`fixed top-3 right-3 bottom-3 z-50 w-[320px] max-w-[calc(100vw-24px)] bg-card rounded-3xl flex flex-col transition-all duration-200 overflow-hidden ${
          open ? "translate-x-0 opacity-100" : "translate-x-[110%] opacity-0 pointer-events-none"
        }`}
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <span id="burger-menu-title" className="font-sans text-[20px] tracking-[-0.01em] text-foreground">
            {t("menu.title")}
          </span>
          <button
            onClick={() => setOpen(false)}
            className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-foreground hover:bg-secondary/80 transition-colors"
            aria-label={t("menu.close") || "Close menu"}
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-5" aria-label={t("menu.title")}>
          {isProjectRoute && (
            <section aria-labelledby="menu-section-nav" className="px-2">
              <p id="menu-section-nav" className="t-eyebrow mb-2 px-2">
                navigation
              </p>
              <div className="flex flex-col gap-0.5">
                {[
                  { path: "/project/dashboard", label: "dashboard" },
                  { path: "/project/milestones", label: t("navigation.milestones") },
                  { path: "/project/evidence", label: t("navigation.evidence") },
                  { path: "/project/payments", label: t("navigation.payments") },
                  { path: "/project/team", label: t("navigation.team") },
                  { path: "/project/activity", label: t("navigation.activity") },
                  { path: "/project/knowledge", label: "knowledge" },
                ].map((item) => (
                  <button
                    key={item.path}
                    onClick={() => go(item.path)}
                    className={itemClass(item.path)}
                    aria-current={isActive(item.path) ? "page" : undefined}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </section>
          )}

          <section aria-labelledby="menu-section-projects" className="px-2">
            <p id="menu-section-projects" className="t-eyebrow mb-2 px-2">{t("menu.projects")}</p>
            <div className="flex flex-col gap-0.5">
              <button onClick={() => go("/create-project")} className={itemClass("/create-project")}>
                {t("project.new_project")}
              </button>
              {projects.length > 1 && (
                <button onClick={() => go("/")} className={itemClass("/")}>
                  {t("project.switch_project")}
                </button>
              )}
              <button onClick={() => go("/admin/ontology")} className={itemClass("/admin/ontology")}>
                app knowledge
              </button>
            </div>
          </section>

          <section aria-labelledby="menu-section-account" className="px-2">
            <p id="menu-section-account" className="t-eyebrow mb-2 px-2">{t("menu.account")}</p>
            {currentUser?.email && (
              <p className="t-label px-4 py-1">{currentUser.email}</p>
            )}
            {editingName ? (
              <div className="space-y-2 mt-2 px-2">
                <input
                  autoFocus
                  className="w-full h-11 px-4 rounded-full bg-secondary text-foreground placeholder:text-muted-foreground font-sans text-[14px] focus:outline-none focus:ring-2 focus:ring-accent/40"
                  placeholder={t("menu.display_name")}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Escape") setEditingName(false); }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveName}
                    disabled={savingName}
                    className="h-9 px-4 rounded-full bg-foreground text-background font-sans text-[13px] disabled:opacity-50"
                  >
                    {savingName ? t("common.loading") : t("common.save")}
                  </button>
                  <button
                    onClick={() => setEditingName(false)}
                    className="h-9 px-4 rounded-full text-muted-foreground font-sans text-[13px]"
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
                className={`${itemBase} text-foreground/70 hover:bg-secondary/60 hover:text-foreground`}
              >
                {t("menu.profile_settings")}
              </button>
            )}
          </section>

          <section aria-labelledby="menu-section-prefs" className="px-4">
            <p id="menu-section-prefs" className="t-eyebrow mb-2">{t("menu.preferences")}</p>
            <p id="lang-group-label" className="t-label mb-2">{t("menu.language")}</p>
            <div className="flex gap-2" role="group" aria-labelledby="lang-group-label">
              {(["en", "it"] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => handleLang(lang)}
                  aria-pressed={activeLang === lang}
                  className={`font-mono text-[12px] px-3.5 py-1.5 rounded-full transition-colors ${
                    activeLang === lang
                      ? "bg-foreground text-background"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>
          </section>

          <section aria-labelledby="menu-section-support" className="px-2 pb-4">
            <p id="menu-section-support" className="t-eyebrow mb-2 px-2">{t("menu.support")}</p>
            <button
              onClick={handleExploreDemo}
              disabled={demoLoading}
              className={`${itemBase} text-foreground/70 hover:bg-secondary/60 hover:text-foreground disabled:opacity-50`}
            >
              {demoLoading ? "loading demo..." : t("auth.explore_demo")}
            </button>
            <button
              onClick={handleSignOut}
              className={`${itemBase} text-muted-foreground hover:bg-secondary/60 hover:text-foreground mt-1`}
            >
              {t("auth.sign_out")}
            </button>
          </section>
        </nav>
      </div>
    </>
  );
}
