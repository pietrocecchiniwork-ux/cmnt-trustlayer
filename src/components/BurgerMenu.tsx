import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useProjects, useCurrentUser } from "@/hooks/useSupabaseProject";
import i18n from "@/i18n/index";

const LANG_KEY = "cmnt_language";

export function BurgerMenu() {
  const [open, setOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [activeLang, setActiveLang] = useState<string>(
    () => localStorage.getItem(LANG_KEY) ?? i18n.language.slice(0, 2) ?? "en"
  );
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data: projects = [] } = useProjects();
  const { data: currentUser } = useCurrentUser();

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Sync lang state when i18n language changes externally
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
    setOpen(false);
    navigate(path);
  };

  return (
    <>
      {/* Hamburger trigger */}
      <button
        onClick={() => setOpen(true)}
        className="fixed top-0 right-0 z-50 p-4 flex flex-col gap-[5px] items-end"
        aria-label="open menu"
      >
        <span className="block w-5 h-px bg-foreground" />
        <span className="block w-5 h-px bg-foreground" />
        <span className="block w-5 h-px bg-foreground" />
      </button>

      {/* Backdrop */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/20" />
      )}

      {/* Slide-in panel */}
      <div
        ref={panelRef}
        className={`fixed top-0 right-0 h-full z-50 w-[280px] bg-background border-l border-border flex flex-col transition-transform duration-200 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
          <span className="font-mono text-[18px] text-foreground">{t("menu.title")}</span>
          <button
            onClick={() => setOpen(false)}
            className="font-mono text-[18px] text-muted-foreground hover:text-foreground transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {/* PROJECTS */}
          <section>
            <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
              {t("menu.projects")}
            </p>
            <button
              onClick={() => go("/project/new")}
              className="w-full text-left font-mono text-[13px] text-foreground py-2 hover:text-accent transition-colors"
            >
              {t("project.new_project")}
            </button>
            {projects.length > 1 && (
              <button
                onClick={() => go("/home")}
                className="w-full text-left font-mono text-[13px] text-foreground py-2 hover:text-accent transition-colors"
              >
                {t("project.switch_project")}
              </button>
            )}
          </section>

          {/* ACCOUNT */}
          <section>
            <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
              {t("menu.account")}
            </p>
            {currentUser?.email && (
              <p className="font-mono text-[11px] text-muted-foreground py-1">{currentUser.email}</p>
            )}
            {editingName ? (
              <div className="space-y-2 mt-2">
                <input
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
                  >
                    {savingName ? t("common.loading") : t("common.save")}
                  </button>
                  <button
                    onClick={() => setEditingName(false)}
                    className="font-mono text-[12px] text-muted-foreground"
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
              >
                {t("menu.profile_settings")}
              </button>
            )}
          </section>

          {/* PREFERENCES */}
          <section>
            <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
              {t("menu.preferences")}
            </p>
            <p className="font-mono text-[11px] text-muted-foreground mb-2">{t("menu.language")}</p>
            <div className="flex gap-2">
              {(["en", "it"] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => handleLang(lang)}
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
          <section>
            <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
              {t("menu.support")}
            </p>
            <button
              onClick={() => go("/demo")}
              className="w-full text-left font-mono text-[13px] text-foreground py-2 hover:text-accent transition-colors"
            >
              {t("auth.explore_demo")}
            </button>
            <button
              onClick={handleSignOut}
              className="w-full text-left font-mono text-[13px] text-muted-foreground py-2 hover:text-foreground transition-colors"
            >
              {t("auth.sign_out")}
            </button>
          </section>
        </div>
      </div>
    </>
  );
}
