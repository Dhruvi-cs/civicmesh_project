import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import HomeDashboard from "./components/HomeDashboard";
import ReportIssue from "./components/ReportIssue";
import ExploreEngine from "./components/ExploreEngine";
import { Ticket } from "./types";

export default function App() {
  const [tickets, setTickets] = useState<Ticket[]>([]);

  // Fetch all tickets from the Node.js/Express backend
  const fetchTickets = async () => {
    try {
      const response = await fetch("/api/tickets");
      if (response.ok) {
        const data = await response.json();
        setTickets(data);
      }
    } catch (error) {
      console.error("Failed to fetch tickets from backend:", error);
    }
  };

  // Mark ticket as resolved
  const handleResolveTicket = async (id: string) => {
    try {
      const response = await fetch(`/api/tickets/${id}/resolve`, {
        method: "POST"
      });
      if (response.ok) {
        await fetchTickets();
      } else {
        console.error("Failed to mark ticket as resolved:", response.statusText);
      }
    } catch (error) {
      console.error("Error updating ticket resolution status:", error);
    }
  };

  // Initial fetch on mount
  useEffect(() => {
    fetchTickets();
  }, []);

  return (
    <Router>
      <div className="flex flex-col h-screen w-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">
        {/* Shared Elegant Navigation Bar component */}
        <Navbar />

        {/* Declarative Multi-Page Route viewport */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Routes>
            {/* 1. HOME DASHBOARD */}
            <Route 
              path="/" 
              element={<HomeDashboard tickets={tickets} />} 
            />

            {/* 2. REPORT COMPONENT */}
            <Route 
              path="/report" 
              element={
                <ReportIssue 
                  tickets={tickets} 
                  onReportSubmitted={fetchTickets} 
                  fetchTickets={fetchTickets}
                />
              } 
            />

            {/* 3. EXPLORE ENGINE */}
            <Route 
              path="/explore" 
              element={
                <ExploreEngine 
                  tickets={tickets} 
                  fetchTickets={fetchTickets} 
                  onResolveTicket={handleResolveTicket}
                />
              } 
            />
          </Routes>
        </div>
      </div>
    </Router>
  );
}
