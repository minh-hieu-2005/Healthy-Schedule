import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * Nếu có lỗi bất ngờ khi hiển thị, thay vì trang bị "đứng", người dùng thấy
 * thông báo và có nút tải lại (dữ liệu vẫn được giữ nguyên).
 */
export default class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Smart Life gặp lỗi:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-dvh flex items-center justify-center p-6">
        <div className="card p-6 max-w-md text-center">
          <p className="text-4xl">😵</p>
          <h1 className="mt-3 text-xl font-extrabold">Ối, có lỗi xảy ra</h1>
          <p className="mt-2 text-sm text-ink-2">
            Dữ liệu của bạn vẫn được giữ nguyên. Hãy tải lại trang để tiếp tục.
          </p>
          <p className="mt-2 text-xs text-ink-3 break-words">{this.state.error.message}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button className="btn btn-primary" onClick={() => window.location.reload()}>
              Tải lại trang
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => {
                window.location.hash = "#/";
                window.location.reload();
              }}
            >
              Về trang chủ
            </button>
          </div>
        </div>
      </div>
    );
  }
}
