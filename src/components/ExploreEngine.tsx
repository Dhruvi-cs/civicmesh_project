import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { 
  motion, 
  AnimatePresence 
} from "motion/react";
import { 
  MapPin, 
  Search, 
  Layers, 
  ShieldCheck, 
  Map, 
  ChevronRight, 
  Clock, 
  AlertCircle, 
  Check, 
  History, 
  ExternalLink 
} from "lucide-react";
import { Ticket } from "../types";

interface ExploreEngineProps {
  tickets: Ticket[];
  fetchTickets: () => Promise<void>;
  onResolveTicket: (id: string) => Promise<void>;
}

export default function ExploreEngine({ tickets, fetchTickets, onResolveTicket }: ExploreEngineProps) {
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("All");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("All");
  const [activeTicketInDetail, setActiveTicketInDetail] = useState<Ticket | null>(null);

  // Map refs
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.FeatureGroup | null>(null);
  const markersMapRef = useRef<{ [key: string]: L.Marker }>({});

  // Fetch tickets initially
  useEffect(() => {
    fetchTickets();
  }, []);

  // Filtered Tickets
  const filteredTickets = tickets.filter((t) => {
    const matchesCategory = selectedCategoryFilter === "All" || t.category === selectedCategoryFilter;
    const matchesStatus = selectedStatusFilter === "All" || t.status === selectedStatusFilter;
    const matchesSearch = searchQuery === "All" || 
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
      t.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesStatus && matchesSearch;
  });

  // SVG Marker creation helper (matches category colors)
  const createCategoryIcon = (category: string, status: string) => {
    let color = "#4F46E5"; // Default
    if (status === "Resolved") {
      color = "#94A3B8"; // Gray for resolved
    } else {
      switch (category) {
        case "Pothole":
          color = "#EF4444"; // Red
          break;
        case "Water Leakage":
          color = "#3B82F6"; // Blue
          break;
        case "Broken Streetlight":
          color = "#F59E0B"; // Orange
          break;
        case "Waste Management":
          color = "#10B981"; // Green
          break;
      }
    }

    const svgIcon = `
      <svg width="34" height="34" viewBox="0 0 32 32" class="drop-shadow-md" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 2C9.37 2 4 7.37 4 14C4 22.18 14.82 29.36 15.3 29.68C15.51 29.82 15.76 29.9 16 29.9C16.24 29.9 16.49 29.82 16.7 29.68C17.18 29.36 28 22.18 28 14C28 7.37 22.63 2 16 2Z" fill="${color}" stroke="#FFFFFF" stroke-width="1.5"/>
        <circle cx="16" cy="13" r="5" fill="#FFFFFF"/>
      </svg>
    `;

    return L.divIcon({
      html: svgIcon,
      iconSize: [34, 34],
      iconAnchor: [17, 34],
      popupAnchor: [0, -34],
      className: "custom-leaflet-marker"
    });
  };

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false
    }).setView([26.8550, 80.9450], 13);
    mapRef.current = map;

    L.control.zoom({ position: "topright" }).addTo(map);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 20
    }).addTo(map);

    markersGroupRef.current = L.featureGroup().addTo(map);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // 2. Refresh Markers dynamically on tickets list or filters change
  useEffect(() => {
    if (!mapRef.current || !markersGroupRef.current) return;

    // Clear existing markers
    markersGroupRef.current.clearLayers();
    markersMapRef.current = {};

    filteredTickets.forEach((ticket) => {
      const icon = createCategoryIcon(ticket.category, ticket.status);
      const marker = L.marker([ticket.latitude, ticket.longitude], { icon });

      // Build rich Map Popup with absolute CSS styling matching our premium layout
      const popupContent = document.createElement("div");
      popupContent.className = "p-3 font-sans space-y-2 min-w-[220px]";
      
      const badgeColor = 
        ticket.category === "Pothole" ? "bg-red-50 text-red-700 border-red-100" :
        ticket.category === "Water Leakage" ? "bg-blue-50 text-blue-700 border-blue-100" :
        ticket.category === "Broken Streetlight" ? "bg-yellow-50 text-yellow-700 border-yellow-100" :
        "bg-emerald-50 text-emerald-700 border-emerald-100";

      popupContent.innerHTML = `
        <div class="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1.5">
          <span class="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase border ${badgeColor}">
            ${ticket.category}
          </span>
          <span class="text-[9px] font-mono text-slate-400 font-bold">${ticket.id}</span>
        </div>
        <p class="text-xs font-semibold text-slate-800 leading-normal line-clamp-3">${ticket.description}</p>
        ${ticket.imageUrl ? `
          <div class="h-20 w-full rounded overflow-hidden border border-slate-100 shadow-sm">
            <img src="${ticket.imageUrl}" class="w-full h-full object-cover" />
          </div>
        ` : ""}
        <div class="flex items-center justify-between text-[9px] text-slate-400 border-t border-slate-100 pt-1.5 mt-1">
          <span>Verification Loops: <b>${ticket.validation_count}</b></span>
          <span class="${ticket.status === 'Resolved' ? 'text-slate-400 font-bold' : 'text-amber-600 font-bold animate-pulse'} uppercase">${ticket.status}</span>
        </div>
      `;

      marker.bindPopup(popupContent, {
        maxWidth: 260
      });

      // Show details sidebar on click
      marker.on("click", () => {
        setActiveTicketInDetail(ticket);
      });

      marker.addTo(markersGroupRef.current!);
      markersMapRef.current[ticket.id] = marker;
    });

    // Auto-fit bounds if we have pins, but keep a reasonable minimum zoom
    if (filteredTickets.length > 0) {
      try {
        const bounds = markersGroupRef.current.getBounds();
        mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      } catch (e) {
        // Safe fail
      }
    }
  }, [tickets, selectedCategoryFilter, selectedStatusFilter, searchQuery]);

  // Handle fly to specific ticket
  const handleFlyToTicket = (ticket: Ticket) => {
    setActiveTicketInDetail(ticket);
    if (mapRef.current && markersMapRef.current[ticket.id]) {
      mapRef.current.setView([ticket.latitude, ticket.longitude], 16);
      markersMapRef.current[ticket.id].openPopup();
    }
  };

  return (
    <div className="flex-1 bg-slate-50 flex flex-col lg:flex-row overflow-hidden relative">
      
      {/* Search & Left Side Filter Panel (2/5 width) */}
      <div className="w-full lg:w-[420px] h-full bg-white border-r border-slate-200 flex flex-col overflow-hidden shrink-0 z-20 shadow-xl">
        {/* Panel header context */}
        <div className="p-5 border-b border-slate-150 bg-slate-50/50 shrink-0">
          <span className="text-[10px] font-mono font-bold text-indigo-600 uppercase tracking-widest block mb-1">
            HAZARDS REGISTRY SEARCH
          </span>
          <h2 className="text-xl font-bold text-slate-900 font-display">
            Explore Active Mesh
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Search, filter, and fly map directly to registered unresolved civic reports.
          </p>

          {/* Text search */}
          <div className="relative mt-4">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by ID or description keyword..."
              onChange={(e) => setSearchQuery(e.target.value.trim() || "All")}
              className="w-full bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 pl-10 pr-4 py-2.5 rounded-xl text-xs font-medium placeholder-slate-400 shadow-sm transition-all"
            />
          </div>

          {/* Dropdown Filters */}
          <div className="grid grid-cols-2 gap-2 mt-2.5">
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="bg-white text-slate-700 text-[11px] font-semibold rounded-lg border border-slate-200 px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm cursor-pointer"
            >
              <option value="All">All Categories</option>
              <option value="Pothole">Potholes Only</option>
              <option value="Water Leakage">Water Leaks</option>
              <option value="Broken Streetlight">Streetlights</option>
              <option value="Waste Management">Waste Mgmt</option>
            </select>

            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="bg-white text-slate-700 text-[11px] font-semibold rounded-lg border border-slate-200 px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Open">Active Pins</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>
        </div>

        {/* Dynamic active scroll feed */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-slate-50/30">
          <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono uppercase tracking-wider mb-2 font-bold">
            <span>Filtered Anomaly Feeds</span>
            <span>Count: {filteredTickets.length}</span>
          </div>

          {filteredTickets.length === 0 ? (
            <div className="text-center py-12 text-slate-400 bg-white border border-dashed border-slate-200 rounded-2xl p-6">
              <p className="text-xs font-semibold">No active issues found</p>
              <p className="text-[10px] text-slate-400 mt-1">Try adjusting your filters or search keywords.</p>
            </div>
          ) : (
            filteredTickets.map((ticket) => {
              const isActive = activeTicketInDetail?.id === ticket.id;
              const badgeStyle = 
                ticket.category === "Pothole" ? "bg-red-50 text-red-700 border-red-200" :
                ticket.category === "Water Leakage" ? "bg-blue-50 text-blue-700 border-blue-200" :
                ticket.category === "Broken Streetlight" ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                "bg-emerald-50 text-emerald-700 border-emerald-200";

              return (
                <button
                  key={ticket.id}
                  onClick={() => handleFlyToTicket(ticket)}
                  className={`w-full text-left p-4 rounded-xl border transition-all flex flex-col gap-2 relative cursor-pointer ${
                    isActive 
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/10" 
                      : ticket.status === "Resolved"
                        ? "bg-slate-100/70 border-slate-200 text-slate-500"
                        : "bg-white border-slate-200 hover:border-indigo-400 text-slate-800 shadow-sm"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 w-full">
                    <span className={`px-2 py-0.5 rounded font-extrabold uppercase tracking-wider text-[9px] border ${
                      isActive ? "bg-indigo-500 text-white border-indigo-400" : badgeStyle
                    }`}>
                      {ticket.category}
                    </span>
                    <div className="flex items-center gap-1">
                      <span className={`font-mono text-[9px] font-bold ${isActive ? "text-indigo-200" : "text-slate-400"}`}>
                        {ticket.id}
                      </span>
                      {ticket.status === "Resolved" ? (
                        <span className="px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded text-[8px] font-extrabold uppercase">Resolved</span>
                      ) : (
                        <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[8px] font-extrabold uppercase animate-pulse">Open</span>
                      )}
                    </div>
                  </div>

                  <p className={`text-xs font-bold leading-normal line-clamp-2 ${isActive ? "text-white" : "text-slate-800"}`}>
                    {ticket.description}
                  </p>

                  <div className={`flex items-center justify-between border-t text-[10px] pt-2 mt-1 ${
                    isActive ? "border-indigo-500/80 text-indigo-100" : "border-slate-100 text-slate-500"
                  }`}>
                    <span className="font-medium">
                      Verification Loops: <strong className={isActive ? "text-white" : "text-slate-800"}>{ticket.validation_count}</strong>
                    </span>
                    <span className="flex items-center gap-0.5 font-bold">
                      Fly View <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Main Map Canvas Area (3/5 width) */}
      <div className="flex-1 h-full relative z-10">
        <div ref={mapContainerRef} className="w-full h-full z-10" />

        {/* Collapsible/Floating Details Sidebar Panel overlay (if any marker is actively chosen) */}
        <AnimatePresence>
          {activeTicketInDetail && (
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className="absolute right-5 bottom-5 top-5 w-[360px] bg-slate-900/95 text-white rounded-2xl p-5 border border-slate-700/50 shadow-2xl z-20 backdrop-blur-md flex flex-col justify-between overflow-y-auto max-h-[90vh]"
            >
              <div className="space-y-4">
                {/* Header detail */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2.5 py-0.5 bg-indigo-600 border border-indigo-500/30 text-white rounded text-[10px] font-extrabold uppercase tracking-wider">
                      {activeTicketInDetail.category}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 font-bold">{activeTicketInDetail.id}</span>
                  </div>
                  <button
                    onClick={() => setActiveTicketInDetail(null)}
                    className="text-slate-400 hover:text-white p-1 rounded bg-slate-800 hover:bg-slate-700 cursor-pointer text-xs font-bold"
                  >
                    Close
                  </button>
                </div>

                {/* Description content */}
                <div className="space-y-3">
                  <span className="text-[9px] font-mono text-slate-400 font-bold uppercase tracking-wider block">REPORT DESCRIPTION</span>
                  <p className="text-xs font-medium leading-relaxed text-slate-200">
                    {activeTicketInDetail.description}
                  </p>
                </div>

                {/* Image preview */}
                {activeTicketInDetail.imageUrl && (
                  <div className="rounded-xl overflow-hidden border border-slate-800 shadow-md">
                    <img src={activeTicketInDetail.imageUrl} className="w-full h-44 object-cover" alt="verification upload" />
                  </div>
                )}

                {/* GPS and timestamps */}
                <div className="grid grid-cols-2 gap-3 bg-slate-800/40 p-3 rounded-xl border border-slate-800/60 font-mono text-[10px]">
                  <div>
                    <span className="text-slate-400 block mb-0.5">GPS COORDINATES</span>
                    <strong className="text-slate-200 font-semibold">{activeTicketInDetail.latitude.toFixed(4)}, {activeTicketInDetail.longitude.toFixed(4)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">REPORTED TIMESTAMP</span>
                    <strong className="text-slate-200 font-semibold">{new Date(activeTicketInDetail.createdAt).toLocaleTimeString()}</strong>
                  </div>
                </div>

                {/* Verification Loops History block */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono text-slate-400 font-bold uppercase tracking-wider">VERIFIED DUPLICATES history</span>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold">{activeTicketInDetail.validation_count} Loops</span>
                  </div>

                  {activeTicketInDetail.updates && activeTicketInDetail.updates.length > 0 ? (
                    <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                      {activeTicketInDetail.updates.map((update, idx) => (
                        <div key={idx} className="bg-slate-800/50 p-2.5 rounded-lg border border-slate-800 text-[10px] leading-relaxed space-y-1">
                          <span className="text-[8px] font-mono text-slate-400 block">{new Date(update.createdAt).toLocaleTimeString()}</span>
                          <p className="text-slate-300 italic font-medium">"{update.description}"</p>
                          {update.imageUrl && (
                            <img src={update.imageUrl} className="h-12 w-full object-cover rounded mt-1.5" />
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-500 italic">No duplicate reports merged into this master ticket yet.</p>
                  )}
                </div>
              </div>

              {/* Action buttons (Resolve) */}
              <div className="pt-4 border-t border-slate-800 mt-4">
                {activeTicketInDetail.status === "Open" ? (
                  <button
                    type="button"
                    onClick={async () => {
                      await onResolveTicket(activeTicketInDetail.id);
                      // Update detail card status
                      setActiveTicketInDetail({
                        ...activeTicketInDetail,
                        status: "Resolved"
                      });
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/10 active:scale-95 transition-all cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    Mark Anomaly Resolved
                  </button>
                ) : (
                  <div className="bg-slate-800 border border-slate-700 text-slate-300 text-center py-3 rounded-xl text-xs font-bold font-mono">
                    ✓ ISSUE FULLY RESOLVED
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
