import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

type Role = "pm" | "contractor" | "trade" | "client";

interface TeamMember {
  name: string;
  phone: string;
  role: Role;
}

const roles: Role[] = ["pm", "contractor", "trade", "client"];

export default function InviteTeam() {
  const navigate = useNavigate();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<Role>("contractor");

  const addMember = () => {
    if (!name.trim()) return;
    setMembers([...members, { name, phone, role }]);
    setName("");
    setPhone("");
  };

  return (
    <div className="flex flex-col min-h-screen bg-background px-6 pt-12 pb-6">
      <button onClick={() => navigate(-1)} className="font-mono text-[13px] text-muted-foreground mb-8">
        ← back
      </button>

      <h1 className="font-sans text-[22px] text-foreground mb-8">invite team</h1>

      <div className="space-y-4 mb-6">
        <input
          type="text"
          placeholder="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="underline-input"
        />
        <input
          type="tel"
          placeholder="phone number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="underline-input"
        />

        {/* Role selector */}
        <div className="flex border-b border-border">
          {roles.map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={`flex-1 py-3 font-mono text-[12px] text-center transition-colors ${
                role === r
                  ? "text-accent border-b-2 border-accent"
                  : "text-muted-foreground"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        <Button variant="outline" size="default" onClick={addMember} className="w-full mt-2">
          <span className="font-sans text-[14px]">add member</span>
        </Button>
      </div>

      {/* Members list */}
      <div className="flex-1">
        {members.map((m, i) => (
          <div key={i} className="flex items-center justify-between py-3 border-b border-border">
            <span className="font-sans text-[14px] text-foreground">{m.name}</span>
            <span className="font-mono text-[11px] text-muted-foreground">{m.role}</span>
          </div>
        ))}
      </div>

      <Button
        variant="dark"
        size="full"
        onClick={() => navigate("/milestone-setup")}
        disabled={members.length === 0}
      >
        <span className="font-sans text-[16px]">send invites</span>
      </Button>
    </div>
  );
}
