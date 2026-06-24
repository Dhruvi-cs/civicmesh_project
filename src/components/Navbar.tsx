import React from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  BarChart2, 
  MapPin, 
  Compass, 
  Sparkles 
} from "lucide-react";

export default function Navbar() {
  const location = useLocation();
  const currentPath = location.pathname;

  const navItems = [
    {
      path: "/",
      label: "Dashboard",
      icon: <BarChart2 className="w-4 h-4" />,
      description: "Impact & Analytics"
    },
    {
      path: "/report",
      label: "Report Issue",
      icon: <MapPin className="w-4 h-4 animate-bounce" />,
      description: "Ingestion & AI Mesh"
    },
    {
      path: "/explore",
      label: "Explore Mesh",
      icon: <Compass className="w-4 h-4 animate-spin" style={{ animationDuration: '20s' }} />,
      description: "Hyperlocal Map"
    }
  ];

  return (
    <nav id="navbar" className="h-20 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 md:px-8 shrink-0 z-30 shadow-xl">
      {/* Brand Logo and Hackathon Subtitle */}
      <div className="flex items-center gap-3">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-all">
            <span className="text-lg text-white font-extrabold font-display">CM</span>
          </div>
          <div>
            <h1 className="text-white font-extrabold text-base md:text-lg tracking-tight font-display flex items-center gap-2 leading-none">
              CivicMesh
              <span className="text-[9px] font-mono tracking-wider font-semibold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded uppercase">
                AI Civic Mesh
              </span>
            </h1>
            <p className="text-[10px] text-slate-400 mt-1 font-mono tracking-wide hidden sm:block">
              Decentralized Verification & Deduplication Mesh
            </p>
          </div>
        </Link>
      </div>

      {/* Primary Routing Navigation Links */}
      <div className="flex items-center gap-2 md:gap-4">
        {navItems.map((item) => {
          const isActive = currentPath === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              id={`nav-link-${item.label.toLowerCase().replace(" ", "-")}`}
              className={`relative flex flex-col md:flex-row items-center gap-2 px-3 md:px-4 py-2 rounded-xl transition-all ${
                isActive
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10 font-bold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              {item.icon}
              <div className="text-center md:text-left">
                <span className="text-xs md:text-sm block leading-none">{item.label}</span>
                <span className="text-[9px] text-slate-500 hidden md:block mt-0.5 font-normal">
                  {item.description}
                </span>
              </div>
              {isActive && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-indigo-400 rounded-full md:hidden" />
              )}
            </Link>
          );
        })}
      </div>

      {/* AI Mesh Active Indicator Badge */}
      <div className="hidden lg:flex items-center gap-2.5 px-4 py-2 bg-slate-800/80 rounded-xl border border-slate-700/60 shadow-inner">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
        </span>
        <div className="text-left font-mono">
          <span className="text-[9px] text-slate-400 block leading-none">GEMINI PROXIMITY ENGINE</span>
          <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1 mt-0.5 leading-none">
            <Sparkles className="w-3 h-3 text-yellow-400 fill-yellow-400" />
            3-Step Mesh Active
          </span>
        </div>
      </div>
    </nav>
  );
}
