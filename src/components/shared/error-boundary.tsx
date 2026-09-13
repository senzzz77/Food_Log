import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface State { hasError: boolean }

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() { return { hasError: true }; }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // Error reporting can be attached here when a production telemetry service is configured.
  }

  render() {
    if (this.state.hasError) return <main className="app-surface flex min-h-screen items-center justify-center p-6"><div className="panel max-w-md rounded-md p-6"><h1 className="text-lg font-semibold">页面暂时无法显示</h1><p className="subtle-text mt-2 text-sm leading-6">请刷新页面后重试。若问题持续出现，请重新启动本地服务。</p><Button className="mt-5" onClick={() => window.location.reload()}>刷新页面</Button></div></main>;
    return this.props.children;
  }
}
