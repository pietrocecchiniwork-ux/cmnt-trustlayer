import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function SubmissionConfirmed() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-background px-6 items-center justify-center text-center">
      <p className="font-mono text-[96px] leading-none tracking-tight text-success">3</p>
      <p className="font-sans text-[20px] text-muted-foreground mt-2">of 4 submitted</p>

      <div className="divider mt-8 mb-6 w-full" />

      <p className="font-mono text-[10px] text-muted-foreground mb-2">still needed</p>
      <p className="font-sans text-[14px] text-foreground">inspection certificate</p>

      <div className="w-full mt-auto pb-6">
        <Button variant="dark" size="full" onClick={() => navigate("/project/dashboard")}>
          <span className="font-sans text-[16px]">back to project</span>
        </Button>
      </div>
    </div>
  );
}
