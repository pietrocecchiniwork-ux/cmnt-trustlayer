import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RoleProvider } from "@/contexts/RoleContext";
import { DemoProjectProvider } from "@/contexts/DemoProjectContext";
import { AppLayout } from "@/components/AppLayout";

import Home from "./pages/Home";
import Onboarding from "./pages/Onboarding";
import Demo from "./pages/Demo";
import Auth from "./pages/Auth";
import CreateProject from "./pages/CreateProject";
import InviteTeam from "./pages/InviteTeam";
import MilestoneSetup from "./pages/MilestoneSetup";
import TemplateSelect from "./pages/TemplateSelect";
import DocumentUpload from "./pages/DocumentUpload";
import ManualMilestone from "./pages/ManualMilestone";
import Dashboard from "./pages/Dashboard";
import MilestoneDetailPage from "./pages/MilestoneDetailPage";
import CameraScreen from "./pages/CameraScreen";
import EvidenceConfirm from "./pages/EvidenceConfirm";
import SubmissionConfirmed from "./pages/SubmissionConfirmed";
import CascadeReview from "./pages/CascadeReview";
import PaymentCertificate from "./pages/PaymentCertificate";
import WhatsAppSim from "./pages/WhatsAppSim";
import TeamScreen from "./pages/TeamScreen";
import EvidenceList from "./pages/EvidenceList";
import PaymentsList from "./pages/PaymentsList";
import MilestonesList from "./pages/MilestonesList";
import SubmitEvidence from "./pages/SubmitEvidence";
import JoinProject from "./pages/JoinProject";
import TaskDetail from "./pages/TaskDetail";
import ProjectActivity from "./pages/ProjectActivity";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <DemoProjectProvider>
        <RoleProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={<Home />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/demo" element={<Demo />} />
              <Route path="/create-project" element={<CreateProject />} />
              <Route path="/invite-team" element={<InviteTeam />} />
              <Route path="/milestone-setup" element={<MilestoneSetup />} />
              <Route path="/template-select" element={<TemplateSelect />} />
              <Route path="/document-upload" element={<DocumentUpload />} />
              <Route path="/manual-milestone" element={<ManualMilestone />} />
              <Route path="/whatsapp-sim" element={<WhatsAppSim />} />
              <Route path="/join" element={<JoinProject />} />
              
              {/* Project screens with bottom nav */}
              <Route element={<AppLayout />}>
                <Route path="/project/dashboard" element={<Dashboard />} />
                <Route path="/project/milestones" element={<MilestonesList />} />
                <Route path="/project/evidence" element={<EvidenceList />} />
                <Route path="/project/payments" element={<PaymentsList />} />
                <Route path="/project/team" element={<TeamScreen />} />
                <Route path="/project/submit" element={<SubmitEvidence />} />
                <Route path="/project/milestone/:milestoneId" element={<MilestoneDetailPage />} />
                <Route path="/project/camera" element={<CameraScreen />} />
                <Route path="/project/evidence-confirm" element={<EvidenceConfirm />} />
                <Route path="/project/submission-confirmed" element={<SubmissionConfirmed />} />
                <Route path="/project/cascade-review" element={<CascadeReview />} />
                <Route path="/project/payment-certificate/:milestoneId" element={<PaymentCertificate />} />
                <Route path="/project/task/:taskId" element={<TaskDetail />} />
                <Route path="/project/activity" element={<ProjectActivity />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </RoleProvider>
      </DemoProjectProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
