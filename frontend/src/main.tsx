import { createRoot } from "react-dom/client";
import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import { configuredApiBaseUrl } from "./lib/api-url";
import { LOCAL_AUTH_TOKEN_KEY } from "./lib/local-auth";
import "./index.css";

setBaseUrl(configuredApiBaseUrl);

if (import.meta.env.VITE_AUTH_MODE === "local") {
  setAuthTokenGetter(() => localStorage.getItem(LOCAL_AUTH_TOKEN_KEY));
}

createRoot(document.getElementById("root")!).render(<App />);
