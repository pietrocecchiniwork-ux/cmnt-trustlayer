import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function Onboarding() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="flex flex-col min-h-screen bg-background px-6 pt-12 pb-6">
      <p className="font-mono text-[18px] text-foreground">cemento</p>

      <p className="font-sans text-[26px] font-light text-foreground mt-10">
        {t("project.what_brings")}
      </p>

      <div className="flex flex-col mt-8" style={{ gap: "12px" }}>
        <button
          onClick={() => navigate("/create-project")}
          className="w-full flex items-center justify-between border border-border bg-background text-left"
          style={{ padding: "20px", borderRadius: 0 }}
        >
          <div className="flex flex-col">
            <span className="font-sans text-[17px] text-foreground">{t("project.managing")}</span>
            <span className="font-mono text-[11px] text-muted-foreground mt-1">
              {t("project.managing_sub")}
            </span>
          </div>
          <span className="font-mono text-[16px] text-muted-foreground ml-4">→</span>
        </button>

        <button
          onClick={() => navigate("/join")}
          className="w-full flex items-center justify-between border border-border bg-background text-left"
          style={{ padding: "20px", borderRadius: 0 }}
        >
          <div className="flex flex-col">
            <span className="font-sans text-[17px] text-foreground">{t("project.joining")}</span>
            <span className="font-mono text-[11px] text-muted-foreground mt-1">
              {t("project.joining_sub")}
            </span>
          </div>
          <span className="font-mono text-[16px] text-muted-foreground ml-4">→</span>
        </button>
      </div>

      <div className="mt-6 text-center">
        <button
          onClick={() => navigate("/demo")}
          className="font-mono text-[11px] text-muted-foreground underline"
        >
          {t("project.explore_first")}
        </button>
      </div>
    </div>
  );
}
