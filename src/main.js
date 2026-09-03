import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";
import "./styles/appointment.css";
import "./styles/patient-entry.css";
import "./styles/pagination.css";
import "./styles/consultation.css";
import "./styles/visit-detail.css";
import "./styles/masters.css";
import "./styles/billing.css";
import "./styles/revenue.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
