import { lazy, Suspense, useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/layout/app-shell";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { PlaceholderPage } from "@/features/shared/placeholder-page";
import { getCurrentUser } from "@/services/auth-service";
import { useAppStore } from "@/stores/app-store";

const AuthPage = lazy(() => import("@/features/auth/auth-page").then(({ AuthPage }) => ({ default: AuthPage })));
const DashboardPage = lazy(() => import("@/features/dashboard/dashboard-page").then(({ DashboardPage }) => ({ default: DashboardPage })));
const DiaryPage = lazy(() => import("@/features/diary/diary-page").then(({ DiaryPage }) => ({ default: DiaryPage })));
const HistoryPage = lazy(() => import("@/features/history/history-page").then(({ HistoryPage }) => ({ default: HistoryPage })));
const BodyProfilePage = lazy(() => import("@/features/metabolism/body-profile-page").then(({ BodyProfilePage }) => ({ default: BodyProfilePage })));
const PlannerPage = lazy(() => import("@/features/planner/planner-page").then(({ PlannerPage }) => ({ default: PlannerPage })));
const ProfilesPage = lazy(() => import("@/features/profiles/profiles-page").then(({ ProfilesPage }) => ({ default: ProfilesPage })));
const ProgressPage = lazy(() => import("@/features/progress/progress-page").then(({ ProgressPage }) => ({ default: ProgressPage })));
const RecipeDetailPage = lazy(() => import("@/features/recipes/recipe-detail-page").then(({ RecipeDetailPage }) => ({ default: RecipeDetailPage })));
const RecipesPage = lazy(() => import("@/features/recipes/recipes-page").then(({ RecipesPage }) => ({ default: RecipesPage })));

function PageLoader() {
  return <div className="app-surface flex min-h-screen items-center justify-center"><p className="subtle-text text-sm">正在加载...</p></div>;
}

function SessionGate() {
  const { authToken, user, setSession, logout, theme } = useAppStore();
  const [checking, setChecking] = useState(Boolean(authToken));
  useEffect(() => { document.documentElement.classList.toggle("dark", theme === "dark"); }, [theme]);
  useEffect(() => {
    if (!authToken) return;
    void getCurrentUser(authToken).then(({ user: currentUser }) => setSession({ token: authToken, user: currentUser })).catch(() => logout()).finally(() => setChecking(false));
  }, [authToken, logout, setSession]);
  if (checking) return <PageLoader />;
  if (!authToken || !user) return <Suspense fallback={<PageLoader />}><AuthPage /></Suspense>;
  return <Suspense fallback={<PageLoader />}><Routes>
    <Route element={<AppShell />}>
      <Route index element={<Navigate to="/recipes" replace />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/recipes" element={<RecipesPage />} />
      <Route path="/recipes/*" element={<RecipeDetailPage />} />
      <Route path="/planner" element={<PlannerPage />} />
      <Route path="/diary" element={<DiaryPage />} />
      <Route path="/history" element={<HistoryPage />} />
      <Route path="/progress" element={<ProgressPage />} />
      <Route path="/profiles" element={<ProfilesPage />} />
      <Route path="/profile/body" element={<BodyProfilePage />} />
      <Route path="/settings" element={<PlaceholderPage title="设置" description="主题偏好已在侧栏提供切换。" />} />
    </Route>
    <Route path="*" element={<Navigate to="/recipes" replace />} />
  </Routes></Suspense>;
}

export function App() {
  return <ErrorBoundary><BrowserRouter><SessionGate /></BrowserRouter></ErrorBoundary>;
}
