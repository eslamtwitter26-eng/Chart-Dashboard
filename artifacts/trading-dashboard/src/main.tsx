import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { AccessGate } from "./components/auth/AccessGate";
import "./index.css";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <AccessGate>
    <QueryClientProvider client={queryClient}><App /></QueryClientProvider>
  </AccessGate>,
);
