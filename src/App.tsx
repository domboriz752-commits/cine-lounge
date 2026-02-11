import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProfileProvider, useProfile } from "@/contexts/ProfileContext";
import Profiles from "./pages/Profiles";
import Home from "./pages/Home";
import FilmPlayer from "./pages/FilmPlayer";
import FilmDetail from "./pages/FilmDetail";
import SearchPage from "./pages/SearchPage";
import MyList from "./pages/MyList";
import UploadPage from "./pages/UploadPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function RequireProfile({ children }: { children: React.ReactNode }) {
  const { activeProfile } = useProfile();
  if (!activeProfile) return <Navigate to="/profiles" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { activeProfile } = useProfile();

  return (
    <Routes>
      <Route path="/profiles" element={<Profiles />} />
      <Route path="/" element={<Navigate to={activeProfile ? "/home" : "/profiles"} replace />} />
      <Route path="/home" element={<RequireProfile><Home /></RequireProfile>} />
      <Route path="/film/:id" element={<RequireProfile><FilmDetail /></RequireProfile>} />
      <Route path="/watch/:id" element={<RequireProfile><FilmPlayer /></RequireProfile>} />
      <Route path="/search" element={<RequireProfile><SearchPage /></RequireProfile>} />
      <Route path="/my-list" element={<RequireProfile><MyList /></RequireProfile>} />
      <Route path="/upload" element={<RequireProfile><UploadPage /></RequireProfile>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ProfileProvider>
          <AppRoutes />
        </ProfileProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
