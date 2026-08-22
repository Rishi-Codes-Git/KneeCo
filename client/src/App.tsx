import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import AllCases from "./pages/AllCases";
import CaseDetail from "./pages/CaseDetail";
import KneeAnalysis from "./pages/KneeAnalysis";
import PreviousCases from "./pages/PreviousCases";
import Home from "./pages/Home";
import HomeDashboard from "./pages/HomeDashboard";
import NewCase from "./pages/NewCase";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/home"} component={HomeDashboard} />
      <Route path={"/cases/:caseId/analysis"} component={KneeAnalysis} />
      <Route path={"/cases/:caseId"} component={CaseDetail} />
      <Route path={"/cases"} component={AllCases} />
      <Route path={"/previous-cases"} component={PreviousCases} />
      <Route path={"/new-case"} component={NewCase} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
