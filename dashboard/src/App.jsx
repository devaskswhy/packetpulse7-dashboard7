import DashboardPage from "./pages/DashboardPage";
import FlowsPage from "./pages/FlowsPage";
import AlertsPage from "./pages/AlertsPage";
import { useDPI } from "./context/DPIContext";
import CyberCursor from "./components/effects/CyberCursor";
import NetworkBackground from "./components/effects/NetworkBackground";
import GlitchText from "./components/effects/GlitchText";
import AlertToast from "./components/effects/AlertToast";
import MatrixIntro from "./components/effects/MatrixIntro";
import { useState, useEffect, useRef, useCallback } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { ACCENT } from './lib/motion';

/* ---- Section definitions ---- */
const SECTIONS = [
  { id: "overview",  label: "Overview",       icon: "📊" },
  { id: "flows",     label: "Live Flows",     icon: "🔀" },
  { id: "alerts",    label: "Active Alerts",  icon: "🔔" },
];

export default function App() {
  const { connectionStatus, stats } = useDPI();
  const [packetsPerSecond, setPacketsPerSecond] = useState(0);
  const previousPacketsRef = useRef(0);
  const previousTimeRef = useRef(Date.now());
  const [activeSection, setActiveSection] = useState("overview");
  const lenisRef = useRef(null);
  const indicatorRef = useRef(null);
  const navLinksRef = useRef({});

  /* ---- Lenis + ScrollTrigger wiring ---- */
  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1 });
    lenisRef.current = lenis;

    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);

    return () => {
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  /* ---- ScrollTrigger per section ---- */
  useEffect(() => {
    const triggers = SECTIONS.map(({ id }) =>
      ScrollTrigger.create({
        trigger: `#${id}`,
        start: "top center",
        end: "bottom center",
        onEnter: () => setActiveSection(id),
        onEnterBack: () => setActiveSection(id),
      })
    );
    return () => triggers.forEach((t) => t.kill());
  }, []);

  /* ---- Slide the active indicator ---- */
  useEffect(() => {
    const link = navLinksRef.current[activeSection];
    const indicator = indicatorRef.current;
    if (!link || !indicator) return;

    const nav = link.closest('.topnav-links');
    if (!nav) return;

    const navRect = nav.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();

    gsap.to(indicator, {
      x: linkRect.left - navRect.left,
      width: linkRect.width,
      duration: 0.4,
      ease: 'power3.out',
    });
  }, [activeSection]);

  /* ---- scrollTo helper ---- */
  const scrollTo = useCallback((id) => {
    lenisRef.current?.scrollTo(`#${id}`, {
      duration: 1.2,
      easing: (t) => 1 - Math.pow(1 - t, 3),
    });
  }, []);

  /* ---- Packets per second ---- */
  useEffect(() => {
    if (stats && stats.total_packets !== undefined) {
      const currentTime = Date.now();
      const timeDiff = (currentTime - previousTimeRef.current) / 1000;
      const packetDiff = stats.total_packets - previousPacketsRef.current;

      if (timeDiff >= 2) {
        const pps = Math.round(packetDiff / timeDiff);
        setPacketsPerSecond(pps);
        previousPacketsRef.current = stats.total_packets;
        previousTimeRef.current = currentTime;
      }
    }
  }, [stats]);

  const getStatusString = () => {
    if (connectionStatus === "live") return "Engine Online (WS)";
    if (connectionStatus === "polling") return "Engine Polling (REST)";
    return "Engine Offline";
  };

  const getStatusColor = () => {
    if (connectionStatus === "live") return "var(--success, #34d399)";
    if (connectionStatus === "polling") return "var(--warning, #fbbf24)";
    return "var(--danger, #fb7185)";
  };

  return (
    <div className="app-scroll-layout">
      <MatrixIntro />
      <CyberCursor />
      <NetworkBackground />

      {/* ---- Fixed Top Navbar ---- */}
      <nav className="topnav" id="topnav">
        {/* Brand */}
        <div className="topnav-brand">
          <div className="topnav-brand-icon">PP</div>
          <div className="topnav-brand-text">
            <GlitchText text="PacketPulse" className="font-bold text-sm" />
          </div>
        </div>

        {/* Nav links */}
        <div className="topnav-links">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              ref={(el) => { navLinksRef.current[s.id] = el; }}
              className={`topnav-link${activeSection === s.id ? " active" : ""}`}
              onClick={() => scrollTo(s.id)}
            >
              <span className="topnav-link-icon">{s.icon}</span>
              <span>{s.label}</span>
            </button>
          ))}
          {/* Sliding active indicator */}
          <div ref={indicatorRef} className="topnav-indicator" />
        </div>

        {/* Right side: status cluster */}
        <div className="topnav-status">
          <div className="topnav-metrics">
            <span>PKT/s: {packetsPerSecond}</span>
          </div>
          <div className="topnav-connection">
            <div
              className={`status-dot${connectionStatus === "live" ? " live" : ""}`}
              style={{ backgroundColor: getStatusColor() }}
            />
            <span>{getStatusString()}</span>
          </div>
          {connectionStatus === "live" && (
            <div className="live-indicator">LIVE</div>
          )}
        </div>
      </nav>

      {/* ---- Sections ---- */}
      <main className="sections-container">
        <section id="overview" className="page-section">
          <div className="section-title-bar">
            <div className="section-accent-bar" />
            <h2 className="section-title">Overview</h2>
          </div>
          <div className="section-content">
            <DashboardPage />
          </div>
        </section>

        <section id="flows" className="page-section">
          <div className="section-title-bar">
            <div className="section-accent-bar" />
            <h2 className="section-title">Live Flows</h2>
          </div>
          <div className="section-content">
            <FlowsPage />
          </div>
        </section>

        <section id="alerts" className="page-section">
          <div className="section-title-bar">
            <div className="section-accent-bar" />
            <h2 className="section-title">Active Alerts</h2>
          </div>
          <div className="section-content">
            <AlertsPage />
          </div>
        </section>
      </main>

      <AlertToast />
    </div>
  );
}
