// Initialize service providers before React renders.
// Error tracking must come first so initialization errors are captured.
import { getErrorTracking, getAnalytics, getMessaging } from "./lib/services";

getErrorTracking();
getAnalytics();
getMessaging();

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
