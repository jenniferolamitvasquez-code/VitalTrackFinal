import { createRoot } from "react-dom/client";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import App from "./App";
import { LOCAL_AUTH_TOKEN_KEY } from "./lib/local-auth";
import "./index.css";

if (import.meta.env.VITE_AUTH_MODE === "local") {
  setAuthTokenGetter(() => localStorage.getItem(LOCAL_AUTH_TOKEN_KEY));
}

createRoot(document.getElementById("root")!).render(<App />);
