import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import "@fontsource/be-vietnam-pro/400.css";
import "@fontsource/be-vietnam-pro/500.css";
import "@fontsource/be-vietnam-pro/600.css";
import "@fontsource/be-vietnam-pro/700.css";
import "@fontsource/be-vietnam-pro/800.css";
import "./index.css";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import { startSession } from "./cloud/session";
import { registerServiceWorker } from "./lib/notify";

// Bắt đầu theo dõi đăng nhập và đăng ký service worker (thông báo hệ thống)
startSession();
void registerServiceWorker();

// HashRouter: các đường dẫn dạng /#/hom-nay nên tải lại trang
// trên GitHub Pages không bị lỗi 404.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <HashRouter>
        <App />
      </HashRouter>
    </ErrorBoundary>
  </StrictMode>,
);
