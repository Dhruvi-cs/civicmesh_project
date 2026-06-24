import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { 
  motion, 
  AnimatePresence 
} from "motion/react";
import { 
  MapPin, 
  UploadCloud, 
  AlertTriangle, 
  CheckCircle, 
  Trash2, 
  Sparkles, 
  Info, 
  Loader2, 
  Map, 
  Database, 
  History, 
  Check, 
  ChevronRight, 
  ExternalLink,
  ShieldCheck,
  Play
} from "lucide-react";
import { Ticket, SubmissionResponse } from "../types";

interface ReportIssueProps {
  tickets: Ticket[];
  onReportSubmitted: () => void;
  fetchTickets: () => Promise<void>;
}

export default function ReportIssue({ tickets, onReportSubmitted, fetchTickets }: ReportIssueProps) {
  // Local Form states
  const [category, setCategory] = useState<string>("Pothole");
  const [description, setDescription] = useState<string>("");
  const [formLat, setFormLat] = useState<string>("26.848120");
  const [formLng, setFormLng] = useState<string>("80.944080");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'workspace' | 'architecture' | 'sandbox'>('workspace');
  const [simulationStatus, setSimulationStatus] = useState<string | null>(null);

  // Pipeline Statuses
  const [pipelineResult, setPipelineResult] = useState<SubmissionResponse | null>(null);
  const [pipelineChecking, setPipelineChecking] = useState<boolean>(false);
  const [pipelineStep, setPipelineStep] = useState<number>(0); // 0: Idle, 1: Geospatial, 2: Gemini comparison, 3: Decision

  // Map refs
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const draggableMarkerRef = useRef<L.Marker | null>(null);

  // Preset scenarios for professional hackathon evaluation
  const SIMULATION_PRESETS = [
    {
      id: "sim-1",
      name: "Duplicate Pothole @ Hazratganj",
      category: "Pothole",
      description: "Large, deep pothole in Hazratganj main market lane. Extremely dangerous for bikes during nighttime.",
      latitude: 26.848120, // ~15m from TKT-1001
      longitude: 80.944080,
      expectedOutcome: "Auto-Merges into Hazratganj Pothole #TKT-1001",
      difficulty: "Hard (Requires AI reasoning)",
      badgeColor: "bg-amber-100 text-amber-800 border-amber-200"
    },
    {
      id: "sim-2",
      name: "Water Leakage @ Hazratganj (Same area, diff category)",
      category: "Water Leakage",
      description: "Massive underground water supply pipe burst right next to Hazratganj road. Water is flooding the sidewalk.",
      latitude: 26.848090, // ~10m from TKT-1001
      longitude: 80.944050,
      expectedOutcome: "Accepts as New Master Ticket (No merge, distinct category)",
      difficulty: "Medium (Requires category filtering)",
      badgeColor: "bg-blue-100 text-blue-800 border-blue-200"
    },
    {
      id: "sim-3",
      name: "Distant Streetlight (No duplicate)",
      category: "Broken Streetlight",
      description: "Streetlights are fully out for a 200m dark stretch near Sector 4 intersection.",
      latitude: 26.862000, // distant from any seed tickets
      longitude: 80.952000,
      expectedOutcome: "Creates New Master Ticket (Instant bypass, efficient)",
      difficulty: "Easy (Bypasses AI check)",
      badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200"
    }
  ];

  // Helper: Haversine distance
  function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const deltaPhi = (lat2 - lat1) * Math.PI / 180;
    const deltaLambda = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Load Simulation Preset
  const handleLoadSimulation = (preset: typeof SIMULATION_PRESETS[0]) => {
    setCategory(preset.category);
    setDescription(preset.description);
    setFormLat(preset.latitude.toFixed(6));
    setFormLng(preset.longitude.toFixed(6));
    removeSelectedFile();
    
    // Smoothly fly map to coordinates and update the marker
    if (draggableMarkerRef.current && mapRef.current) {
      draggableMarkerRef.current.setLatLng([preset.latitude, preset.longitude]);
      mapRef.current.setView([preset.latitude, preset.longitude], 15);
      draggableMarkerRef.current.getTooltip()?.setContent(`<b>Simulation Pin</b><br>${preset.name}`);
    }
    
    setSimulationStatus(`Demo Preset "${preset.name}" loaded! Feel free to click "Initialize Verification" to test.`);
    
    // Auto clear simulation banner after a few seconds
    setTimeout(() => {
      setSimulationStatus(null);
    }, 4000);
  };

  // SVG Marker Helper
  const createDraggableIcon = () => {
    const svgIcon = `
      <svg width="34" height="34" viewBox="0 0 32 32" class="drop-shadow-md animate-bounce" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 2C9.37 2 4 7.37 4 14C4 22.18 14.82 29.36 15.3 29.68C15.51 29.82 15.76 29.9 16 29.9C16.24 29.9 16.49 29.82 16.7 29.68C17.18 29.36 28 22.18 28 14C28 7.37 22.63 2 16 2Z" fill="#F59E0B" stroke="#FFFFFF" stroke-width="1.5"/>
        <circle cx="16" cy="13" r="5" fill="#FFFFFF"/>
      </svg>
    `;
    return L.divIcon({
      html: svgIcon,
      iconSize: [34, 34],
      iconAnchor: [17, 34],
      popupAnchor: [0, -34],
      className: "custom-draggable-marker"
    });
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Center Hazratganj initially (26.8480, 80.9440)
    const map = L.map(mapContainerRef.current, {
      zoomControl: false
    }).setView([26.8480, 80.9440], 14);
    mapRef.current = map;

    L.control.zoom({ position: "topright" }).addTo(map);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 20
    }).addTo(map);

    // Draggable Marker for current report coordinates
    const startLat = parseFloat(formLat);
    const startLng = parseFloat(formLng);
    const marker = L.marker([startLat, startLng], {
      draggable: true,
      icon: createDraggableIcon()
    }).addTo(map);

    marker.bindTooltip("<b>Target Incident Pin</b><br>Drag me anywhere in Lucknow", {
      permanent: true,
      direction: "top",
      offset: [0, -10]
    }).openTooltip();

    draggableMarkerRef.current = marker;

    // Listen to drag event
    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      setFormLat(pos.lat.toFixed(6));
      setFormLng(pos.lng.toFixed(6));
    });

    // Cleanup on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Drag and Drop files handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (file: File) => {
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
  };

  // Submit report to the 3-Step Civic Verification pipeline
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setPipelineChecking(true);
    setPipelineResult(null);

    // Interactive visualization progress steps simulation
    setPipelineStep(1); // geospatial scan
    await new Promise(resolve => setTimeout(resolve, 1400));

    // Check if there is anything nearby to run AI comparison
    const latNum = parseFloat(formLat);
    const lngNum = parseFloat(formLng);
    const nearby = tickets.filter(t => t.status === "Open" && haversineDistance(latNum, lngNum, t.latitude, t.longitude) <= 50);
    
    if (nearby.length > 0) {
      setPipelineStep(2); // AI verification comparison
      await new Promise(resolve => setTimeout(resolve, 2000));
    } else {
      // Direct bypass to registration
      setPipelineStep(2);
      await new Promise(resolve => setTimeout(resolve, 600));
    }

    setPipelineStep(3); // Merge decision
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Submit API request
    try {
      const formData = new FormData();
      formData.append("category", category);
      formData.append("description", description);
      formData.append("latitude", formLat);
      formData.append("longitude", formLng);
      if (selectedFile) {
        formData.append("image", selectedFile);
      }

      const response = await fetch("/api/tickets", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const result: SubmissionResponse = await response.json();
        setPipelineResult(result);
        
        // Reset form inputs
        setDescription("");
        removeSelectedFile();
        
        // Trigger parent state reload
        onReportSubmitted();
      } else {
        const err = await response.json();
        alert(`Verification Pipeline Error: ${err.error || "Submission failed"}`);
      }
    } catch (err) {
      console.error(err);
      alert("Verification Pipeline Service is currently unreachable. Please check your console.");
    } finally {
      setLoading(false);
      setPipelineChecking(false);
      setPipelineStep(0);
    }
  };

  // Fly Map Helper
  const flyToPresetCoordinates = (lat: number, lng: number) => {
    if (mapRef.current && draggableMarkerRef.current) {
      mapRef.current.setView([lat, lng], 15);
      draggableMarkerRef.current.setLatLng([lat, lng]);
      setFormLat(lat.toFixed(6));
      setFormLng(lng.toFixed(6));
    }
  };

  return (
    <div className="flex-1 bg-slate-50 flex flex-col lg:flex-row overflow-hidden">
      {/* Left Pane: Interactive Map Coordinate Selector & Sandbox Presets (3/5 width) */}
      <div className="flex-1 lg:flex-[3] p-6 flex flex-col gap-6 overflow-y-auto">
        {/* Upper title context */}
        <div>
          <span className="text-xs font-mono font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-1 rounded uppercase tracking-wider">
            STEP 1: LOCATION ACCURACY PINNING
          </span>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight font-display mt-2">
            Pin Hazard Coordinates
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Drag the gold marker on the interactive map below to target the precise coordinates of the civic incident.
          </p>
        </div>

        {/* Map Frame Card */}
        <div className="h-[380px] md:h-[450px] bg-white p-2.5 rounded-2xl border border-slate-200/80 shadow-md relative group shrink-0">
          <div ref={mapContainerRef} className="w-full h-full rounded-xl overflow-hidden shadow-inner z-10" />
          
          {/* Coordinates HUD overlay on top-left of the map */}
          <div className="absolute top-5 left-5 bg-slate-900/90 text-white rounded-xl p-3 border border-slate-700/50 shadow-lg font-mono text-xs z-20 backdrop-blur-sm">
            <span className="text-[9px] text-slate-400 font-bold uppercase block mb-1">LIVE GPS TELEMETRY</span>
            <div className="space-y-0.5">
              <p>LAT: <span className="text-emerald-400 font-bold">{formLat}</span></p>
              <p>LNG: <span className="text-emerald-400 font-bold">{formLng}</span></p>
            </div>
          </div>
        </div>

        {/* Sandbox Presets (Ideal for evaluation & testing) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col shrink-0">
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800 font-display flex items-center gap-1.5">
                <Play className="w-4 h-4 text-emerald-500 fill-emerald-500" />
                Hackathon Sandbox Lab
              </h3>
              <p className="text-[11px] text-slate-400">Instantly test the 3-Step AI duplicate auto-merging loops using our predefined incident scenarios.</p>
            </div>
            <span className="text-[9px] font-mono font-extrabold bg-emerald-50 text-emerald-600 border border-emerald-100 px-2.5 py-1 rounded uppercase">
              Judge Tool
            </span>
          </div>

          {simulationStatus && (
            <div className="mb-3.5 bg-emerald-50 border border-emerald-100 text-emerald-900 p-2.5 rounded-xl text-xs flex items-start gap-2 animate-pulse-ring">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="font-medium text-[11px]">{simulationStatus}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SIMULATION_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleLoadSimulation(preset)}
                className="text-left p-3.5 rounded-xl border border-slate-150 hover:border-indigo-400 bg-slate-50/50 hover:bg-white cursor-pointer hover:shadow-md transition-all flex flex-col justify-between h-36"
              >
                <div>
                  <div className="flex justify-between items-start gap-1">
                    <span className="text-[10px] font-extrabold font-display text-slate-800 truncate block max-w-[120px]">
                      {preset.name}
                    </span>
                    <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-600 border border-slate-300/40">
                      {preset.category}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed mt-1.5">
                    {preset.description}
                  </p>
                </div>

                <div className="border-t border-slate-100 pt-2 mt-2">
                  <div className="flex justify-between items-center text-[9px]">
                    <span className="text-slate-400">Outcome:</span>
                    <strong className="text-indigo-600 font-bold">{preset.expectedOutcome}</strong>
                  </div>
                  <div className="flex justify-between items-center text-[8px] mt-0.5">
                    <span className="text-slate-400">Difficulty:</span>
                    <span className="text-slate-500 font-mono font-medium">{preset.difficulty}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right Pane: Report Ingestion Form & Live AI Pipeline Feedback (2/5 width) */}
      <div className="w-full lg:w-[460px] h-full bg-white border-t lg:border-t-0 lg:border-l border-slate-200 overflow-y-auto flex flex-col shrink-0 z-10">
        
        {/* Step-by-Step AI Pipeline Status Panel (Top sticky for visual drama) */}
        <div className="px-6 py-5 border-b border-slate-200 bg-indigo-50/20">
          <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-600 mb-3.5 flex items-center gap-2 font-mono">
            <Sparkles className="w-4 h-4 text-indigo-600 fill-indigo-200 animate-pulse" />
            AI MESH PIPELINE TELEMETRY
          </h3>

          <AnimatePresence mode="wait">
            {pipelineChecking && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3 bg-white p-4.5 rounded-2xl border border-indigo-200/60 shadow-md"
              >
                <div className="flex items-center gap-3 text-sm text-slate-800">
                  <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                  <span className="font-bold text-indigo-600 font-display">Executing Mesh Pipeline...</span>
                </div>

                <div className="space-y-2 mt-2 font-mono text-[10px]">
                  {/* Step 1 */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${pipelineStep >= 1 ? "bg-amber-500 animate-ping" : "bg-slate-300"}`} />
                      <span className={pipelineStep >= 1 ? "text-amber-600 font-bold" : "text-slate-400"}>STEP 1: 50m Geospatial scan</span>
                    </span>
                    {pipelineStep > 1 ? <Check className="w-4 h-4 text-emerald-500" /> : <span className="text-[9px] text-slate-400">Analysing...</span>}
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${pipelineStep >= 2 ? "bg-indigo-500 animate-ping" : "bg-slate-300"}`} />
                      <span className={pipelineStep >= 2 ? "text-indigo-600 font-bold" : "text-slate-400"}>STEP 2: Gemini comparison</span>
                    </span>
                    {pipelineStep > 2 ? <Check className="w-4 h-4 text-emerald-500" /> : <span className="text-[9px] text-slate-400">Awaiting...</span>}
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${pipelineStep >= 3 ? "bg-pink-500 animate-ping" : "bg-slate-300"}`} />
                      <span className={pipelineStep >= 3 ? "text-pink-600 font-bold" : "text-slate-400"}>STEP 3: Auto-Merge verdict</span>
                    </span>
                    {pipelineStep > 3 ? <Check className="w-4 h-4 text-emerald-500" /> : <span className="text-[9px] text-slate-400">Awaiting...</span>}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Pipeline Result display */}
            {!pipelineChecking && pipelineResult && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className={`p-4 rounded-2xl border text-xs space-y-3.5 shadow-lg ${
                  pipelineResult.event === "MERGED" 
                    ? "bg-amber-50/70 border-amber-200 text-amber-900" 
                    : "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2.5">
                    {pipelineResult.event === "MERGED" ? (
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
                    ) : (
                      <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5 animate-bounce" />
                    )}
                    <div>
                      <span className="font-extrabold text-sm block uppercase tracking-wider font-display">
                        Pipeline Outcome: {pipelineResult.event}
                      </span>
                      <p className="text-[11px] opacity-80 leading-relaxed mt-0.5">{pipelineResult.message}</p>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setPipelineResult(null)}
                    className="text-slate-500 hover:text-slate-800 p-1 rounded-lg bg-white/80 border border-slate-200 cursor-pointer shadow-sm text-[10px] font-bold"
                  >
                    Dismiss
                  </button>
                </div>

                {/* Sub-verdict card */}
                <div className="grid grid-cols-2 gap-2.5 text-[11px] bg-white p-3 rounded-xl border border-slate-150 shadow-sm font-mono">
                  <div>
                    <span className="text-slate-400 block text-[9px] font-bold uppercase mb-0.5">Proximity Radius Scan</span>
                    <strong className={pipelineResult.verification.flagged ? "text-amber-700 font-extrabold" : "text-slate-600 font-bold"}>
                      {pipelineResult.verification.flagged 
                        ? `Flagged within ${pipelineResult.verification.distanceMeters?.toFixed(1)}m` 
                        : "No nearby ticket"
                      }
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] font-bold uppercase mb-0.5">Gemini Verification Method</span>
                    <strong className="text-slate-600 font-bold">
                      {pipelineResult.verification.flagged 
                        ? (pipelineResult.verification.usedMultimodal ? "Multimodal Vision" : "Text similarity") 
                        : "Direct registration"
                      }
                    </strong>
                  </div>
                </div>

                {/* AI reasoning explanation */}
                {pipelineResult.verification.flagged && (
                  <div className="space-y-2.5 bg-white p-3 rounded-xl border border-slate-150 shadow-sm leading-relaxed">
                    <div className="flex justify-between items-center text-[11px] font-mono">
                      <span className="text-slate-400 font-bold uppercase">Gemini Similarity Score</span>
                      <span className={`px-2 py-0.5 rounded font-extrabold text-[10px] border ${
                        pipelineResult.verification.isDuplicate 
                          ? "bg-red-50 text-red-700 border-red-100" 
                          : "bg-emerald-50 text-emerald-700 border-emerald-100"
                      }`}>
                        {pipelineResult.verification.isDuplicate ? "DUPLICATE VERIFIED" : "DISTINCT CASE"}
                      </span>
                    </div>

                    {/* slider confidence */}
                    <div>
                      <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                        <span>Mesh Confidence (Threshold &gt;= 75%)</span>
                        <span className="font-extrabold text-slate-800">{(pipelineResult.verification.confidence * 100).toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${
                            pipelineResult.verification.confidence >= 0.75 ? "bg-indigo-600" : "bg-slate-400"
                          }`}
                          style={{ width: `${pipelineResult.verification.confidence * 100}%` }}
                        />
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-500 leading-relaxed border-t border-slate-100 pt-2.5 mt-1 italic font-sans">
                      <strong>AI Verdict Logic:</strong> "{pipelineResult.verification.reasoning}"
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Default idle status */}
            {!pipelineChecking && !pipelineResult && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-indigo-50 border border-indigo-100/50 rounded-2xl p-4 text-xs text-indigo-950 flex items-start gap-3"
              >
                <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-extrabold text-indigo-900 font-display">Status: Pipeline Idle</p>
                  <p className="leading-relaxed text-indigo-700 text-[11px]">Pin coordinates on the map, provide descriptions/evidence photos, and click the button to trigger Gemini deduplication analysis.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Primary Ingestion Form */}
        <div className="p-6 flex-1">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 mb-4 font-display">
            Anomaly Details Form
          </h3>

          <form onSubmit={handleSubmitReport} className="space-y-5">
            
            {/* Category selection */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 font-mono">
                Anomaly Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold cursor-pointer shadow-sm transition-colors"
              >
                <option value="Pothole">Pothole (Roadway structural failure)</option>
                <option value="Water Leakage">Water Leakage (Burst pipe or flooding)</option>
                <option value="Broken Streetlight">Broken Streetlight (Dark stretch hazard)</option>
                <option value="Waste Management">Waste Management (Unmanaged garbage)</option>
              </select>
            </div>

            {/* Image attachment dropzone */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 font-mono">
                Evidence Anomaly Photo
              </label>
              
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => document.getElementById("file-upload-input-page")?.click()}
                className={`border-2 border-dashed rounded-2xl p-5 text-center flex flex-col items-center justify-center transition-all cursor-pointer ${
                  dragActive
                    ? "border-indigo-500 bg-indigo-50"
                    : previewUrl
                      ? "border-slate-200 bg-slate-50"
                      : "border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300"
                }`}
              >
                <input
                  id="file-upload-input-page"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                />

                {previewUrl ? (
                  <div className="w-full space-y-3 relative">
                    <img src={previewUrl} className="w-full h-36 object-cover rounded-xl border border-slate-200 shadow-md" alt="evidence preview" />
                    <div className="flex items-center justify-between text-xs bg-white p-2.5 rounded-xl border border-slate-150">
                      <span className="truncate text-slate-600 font-mono text-[10px] font-semibold max-w-[200px]">
                        {selectedFile?.name}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeSelectedFile(); }}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="bg-white p-3 rounded-2xl border border-slate-150 shadow-sm mb-2">
                      <UploadCloud className="w-6 h-6 text-indigo-600" />
                    </div>
                    <p className="text-xs text-slate-700 font-bold mb-0.5">Drag and drop your incident image here</p>
                    <p className="text-[10px] text-slate-400 font-mono">JPEG/PNG, MAX 10MB (Optional but highly recommended)</p>
                  </>
                )}
              </div>
            </div>

            {/* Text description */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 font-mono">
                Anomaly Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                required
                placeholder="Detail the failure structure, size, hazards, or landmark details. This text is parsed directly by Gemini."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed font-medium shadow-sm"
              />
            </div>

            {/* Ingestion submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-4 px-4 rounded-xl shadow-lg shadow-indigo-600/10 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:bg-slate-400"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Processing Verification Loops...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                  <span>Initialize Verification</span>
                </>
              )}
            </button>

          </form>
        </div>
      </div>

    </div>
  );
}
