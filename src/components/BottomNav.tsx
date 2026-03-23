import { useLocation, useNavigate } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";

const pmLinks = [
  { label: "dashboard", path: "/project/dashboard" },
  { label: "milestones", path: "/project/milestones" },
  { label: "evidence", path: "/project/evidence" },
  { label: "payments", path: "/project/payments" },
  { label: "team", path: "/project/team" },
];

const contractorLinks = [
  { label: "dashboard", path: "/project/dashboard" },
  { label: "my tasks", path: "/project/milestones" },
  { label: "submit", path: "/project/submit" },
];

export function BottomNav() {
  const { role } = useRole();
  const location = useLocation();
  const navigate = useNavigate();

  if (role === "client") return null;

  const links = role === "pm" ? pmLinks : contractorLinks;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-40">
      <div className="max-w-md mx-auto flex justify-around py-3 px-6">
        {links.map((link) => (
          <button
            key={link.path}
            onClick={() => navigate(link.path)}
            className={`font-mono text-[10px] transition-colors ${
              location.pathname === link.path
                ? "text-accent"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {link.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
