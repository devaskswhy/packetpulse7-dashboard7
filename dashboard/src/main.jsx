import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { DPIProvider } from "./context/DPIContext";
import App from "./App.jsx";
import "./index.css";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <DPIProvider>
      <App />
    </DPIProvider>
  </StrictMode>
);
