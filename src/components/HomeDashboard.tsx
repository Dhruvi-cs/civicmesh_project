import React from "react";
import { Link } from "react-router-dom";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip as ChartTooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  CartesianGrid
} from "recharts";
import { 
  motion 
} from "motion/react";
import { 
  AlertCircle, 
  CheckCircle, 
  Sparkles, 
  DollarSign, 
  Users, 
  Award, 
  TrendingUp, 
  Layers, 
  MapPin, 
  ShieldCheck, 
  ArrowUpRight 
} from "lucide-react";
import { Ticket } from "../types";

interface HomeDashboardProps {
  tickets: Ticket[];
}

export default function HomeDashboard({ tickets }: HomeDashboardProps) {
  // 1. Dynamic Metric Calculations
  const totalReports = tickets.length;
  const duplicatesMerged = tickets.reduce((sum, t) => sum + (t.updates?.length || 0), 0);
  const totalPipelineSubmissions = totalReports + duplicatesMerged;
  
  const activeReports = tickets.filter(t => t.status === "Open").length;
  const resolvedReports = tickets.filter(t => t.status === "Resolved").length;
  
  // Weekly resolved calculations (let's say we have some resolved + mock historical resolved reports)
  const resolvedThisWeek = resolvedReports + 14; 
  const civicFundsSaved = duplicatesMerged * 150; // $150 saved per duplicate crew trip avoided

  // 2. Prepare Data for Recharts Category Breakdown
  const categoriesList = ["Pothole", "Water Leakage", "Broken Streetlight", "Waste Management"];
  const categoryData = categoriesList.map(cat => {
    const count = tickets.filter(t => t.category === cat).length;
    const merged = tickets.filter(t => t.category === cat).reduce((sum, t) => sum + (t.updates?.length || 0), 0);
    return {
      name: cat,
      "Active Pins": count,
      "Duplicates Merged": merged,
    };
  });

  // 3. Prepare Data for Historical Trend AreaChart (7 Days)
  const trendData = [
    { day: "Jun 18", Reports: 22, Resolved: 18 },
    { day: "Jun 19", Reports: 28, Resolved: 22 },
    { day: "Jun 20", Reports: 35, Resolved: 25 },
    { day: "Jun 21", Reports: 41, Resolved: 32 },
    { day: "Jun 22", Reports: 45, Resolved: 39 },
    { day: "Jun 23", Reports: 49, Resolved: 42 },
    { day: "Jun 24", Reports: totalPipelineSubmissions, Resolved: resolvedThisWeek },
  ];

  // 4. Simulated Gamified Civic Leaderboard
  const leaderboard = [
    { rank: 1, name: "Prashant Misra", submissions: 18, merges: 12, impact: "Elite Guardian", points: 2840, color: "text-amber-500 bg-amber-50" },
    { rank: 2, name: "Anjali Verma", submissions: 14, merges: 9, impact: "Master Verifier", points: 2150, color: "text-slate-500 bg-slate-50" },
    { rank: 3, name: "Kabir Khan", submissions: 11, merges: 6, impact: "Active Civic Hero", points: 1620, color: "text-amber-700 bg-amber-50/50" },
    { rank: 4, name: "Sneha Rastogi", submissions: 9, merges: 5, impact: "Local Guardian", points: 1210, color: "text-indigo-600 bg-indigo-50" },
    { rank: 5, name: "Rohit Dwivedi", submissions: 7, merges: 3, impact: "Contributor", points: 840, color: "text-emerald-600 bg-emerald-50" }
  ];

  // Staggered Container Animation
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
  };

  return (
    <div className="flex-1 bg-slate-50 p-6 md:p-8 overflow-y-auto">
      {/* Upper header section */}
      <div className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono font-bold text-indigo-600 uppercase tracking-widest block mb-1">
            MUNICIPAL OPERATIONS OVERVIEW
          </span>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight font-display">
            City Impact Dashboard
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Real-time verification pipeline telemetry, deduplication metrics, and community participation leaderboard.
          </p>
        </div>
        
        {/* Navigation Action Buttons */}
        <div className="flex items-center gap-3">
          <Link
            to="/report"
            className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-600/10 transition-all text-sm font-bold flex items-center gap-2"
          >
            <MapPin className="w-4 h-4" />
            File New Report
          </Link>
          <Link
            to="/explore"
            className="px-5 py-3 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-xl shadow-sm transition-all text-sm font-bold flex items-center gap-2"
          >
            <Layers className="w-4 h-4 text-slate-600" />
            Live Map View
          </Link>
        </div>
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="max-w-7xl mx-auto space-y-8"
      >
        {/* Bento Grid: Community Health Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Active Reports */}
          <motion.div 
            variants={itemVariants}
            className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-start justify-between relative overflow-hidden"
          >
            <div className="space-y-2">
              <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider block">
                Active Reports
              </span>
              <strong className="text-3xl font-extrabold text-slate-900 block font-mono">
                {activeReports}
              </strong>
              <span className="text-xs font-semibold text-rose-500 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                Unresolved Anomaly Pins
              </span>
            </div>
            <div className="p-3 bg-red-50 text-red-600 rounded-xl border border-red-100 shadow-inner">
              <AlertCircle className="w-5 h-5" />
            </div>
          </motion.div>

          {/* Card 2: Issues Resolved */}
          <motion.div 
            variants={itemVariants}
            className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-start justify-between relative overflow-hidden"
          >
            <div className="space-y-2">
              <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider block">
                Resolved This Week
              </span>
              <strong className="text-3xl font-extrabold text-slate-900 block font-mono">
                {resolvedThisWeek}
              </strong>
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                +14 from history logs
              </span>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 shadow-inner">
              <CheckCircle className="w-5 h-5" />
            </div>
          </motion.div>

          {/* Card 3: Duplicates Prevented */}
          <motion.div 
            variants={itemVariants}
            className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-start justify-between relative overflow-hidden"
          >
            <div className="space-y-2">
              <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider block">
                AI Duplicates Prevented
              </span>
              <strong className="text-3xl font-extrabold text-indigo-600 block font-mono">
                {duplicatesMerged}
              </strong>
              <span className="text-xs font-semibold text-indigo-600 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 fill-indigo-200" />
                3-Step verification loops
              </span>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100 shadow-inner">
              <Sparkles className="w-5 h-5" />
            </div>
          </motion.div>

          {/* Card 4: Estimated Funds Saved */}
          <motion.div 
            variants={itemVariants}
            className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-start justify-between relative overflow-hidden"
          >
            <div className="space-y-2">
              <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider block">
                Civic Funds Saved
              </span>
              <strong className="text-3xl font-extrabold text-emerald-600 block font-mono">
                ${civicFundsSaved}
              </strong>
              <span className="text-xs font-semibold text-slate-500">
                $150 saved per duplicate trip
              </span>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 shadow-inner">
              <DollarSign className="w-5 h-5" />
            </div>
          </motion.div>
        </div>

        {/* Charts & Graphs Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart Area (2/3 width) */}
          <motion.div 
            variants={itemVariants}
            className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col h-[400px]"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-display flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                  Civic Issues vs Resolution Velocity
                </h3>
                <p className="text-xs text-slate-400">Comparing pipeline ingestion vs resolved tickets over time</p>
              </div>
            </div>
            <div className="flex-1 w-full text-xs font-mono">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorReports" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="day" stroke="#94A3B8" />
                  <YAxis stroke="#94A3B8" />
                  <ChartTooltip 
                    contentStyle={{ backgroundColor: "#0F172A", color: "#F8FAFC", borderRadius: "12px", border: "none" }}
                  />
                  <Area type="monotone" dataKey="Reports" stroke="#4F46E5" strokeWidth={2.5} fillOpacity={1} fill="url(#colorReports)" />
                  <Area type="monotone" dataKey="Resolved" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorResolved)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Categorical Bar Chart (1/3 width) */}
          <motion.div 
            variants={itemVariants}
            className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col h-[400px]"
          >
            <div>
              <h3 className="text-base font-bold text-slate-900 font-display flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                Mesh Category Distribution
              </h3>
              <p className="text-xs text-slate-400">Total active reports and merged duplicates</p>
            </div>
            <div className="flex-1 w-full text-[10px] font-mono mt-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} layout="vertical" margin={{ top: 10, right: 10, left: 15, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                  <XAxis type="number" stroke="#94A3B8" />
                  <YAxis dataKey="name" type="category" stroke="#64748B" width={80} />
                  <ChartTooltip 
                    contentStyle={{ backgroundColor: "#0F172A", color: "#F8FAFC", borderRadius: "12px", border: "none" }}
                  />
                  <Bar dataKey="Active Pins" fill="#EF4444" radius={[0, 4, 4, 0]} stackId="a" />
                  <Bar dataKey="Duplicates Merged" fill="#EAB308" radius={[0, 4, 4, 0]} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* Lower Grid: Gamified Leaderboard and Platform Explainer */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Leaderboard panel (2/3 width) */}
          <motion.div 
            variants={itemVariants}
            className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-display flex items-center gap-2">
                  <Award className="w-5 h-5 text-indigo-600" />
                  Civic Leaderboard
                </h3>
                <p className="text-xs text-slate-400">Top citizens driving deduplication and infrastructure health loops</p>
              </div>
              <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-1 rounded">
                Updated Real-Time
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Rank</th>
                    <th className="py-3 px-4">Citizen Name</th>
                    <th className="py-3 px-4">Verified Submissions</th>
                    <th className="py-3 px-4">Duplicates Flagged</th>
                    <th className="py-3 px-4">Impact Badge</th>
                    <th className="py-3 px-4 text-right">Points</th>
                  </tr>
                </thead>
                <tbody className="text-slate-700 text-xs divide-y divide-slate-50">
                  {leaderboard.map((user) => (
                    <tr key={user.rank} className="hover:bg-slate-50/55 transition-colors">
                      <td className="py-4 px-4 font-mono font-bold">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold font-mono text-xs ${
                          user.rank === 1 ? "bg-amber-100 text-amber-700 border border-amber-200" :
                          user.rank === 2 ? "bg-slate-100 text-slate-700 border border-slate-200" :
                          user.rank === 3 ? "bg-amber-50 text-amber-800 border border-amber-100" :
                          "bg-slate-50 text-slate-500 border border-slate-100"
                        }`}>
                          {user.rank}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-semibold text-slate-800 text-sm">{user.name}</span>
                      </td>
                      <td className="py-4 px-4 font-mono font-semibold">{user.submissions}</td>
                      <td className="py-4 px-4 font-mono text-amber-600 font-semibold">{user.merges}</td>
                      <td className="py-4 px-4">
                        <span className="px-2.5 py-1 bg-indigo-50 border border-indigo-100/60 rounded text-[10px] text-indigo-600 font-bold uppercase tracking-wider">
                          {user.impact}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right font-mono font-extrabold text-indigo-600">
                        {user.points} pts
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Core Pipeline visual explainer */}
          <motion.div 
            variants={itemVariants}
            className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col justify-between"
          >
            <div className="space-y-4">
              <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase tracking-widest block">
                HOW CIVICMESH WORKS
              </span>
              <h3 className="text-lg font-bold font-display text-white">
                The 3-Step Verification loop
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                By automating report verification via multi-modal location queries and AI spatial correlation, CivicMesh eliminates duplicate manual inspection dispatching entirely.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold font-mono">
                    1
                  </div>
                  <div>
                    <strong className="text-xs font-semibold block text-slate-200">Geospatial Radial Scanning</strong>
                    <span className="text-[11px] text-slate-400">Identifies any active unresolved municipal pins sitting inside a hyperlocal 50m radius.</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-amber-500 rounded-md flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold font-mono">
                    2
                  </div>
                  <div>
                    <strong className="text-xs font-semibold block text-slate-200">Gemini Multimodal Analysis</strong>
                    <span className="text-[11px] text-slate-400">Compares textual claims and visual uploads against nearby seeds to verify similarity.</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-pink-500 rounded-md flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold font-mono">
                    3
                  </div>
                  <div>
                    <strong className="text-xs font-semibold block text-slate-200">Deduplication Merge Decision</strong>
                    <span className="text-[11px] text-slate-400">Either merges similarity reports into existing open tickets or safely registers a new master report.</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-800 mt-6 flex justify-between items-center text-xs">
              <span className="text-slate-500 font-mono">Ready to verify Lucknow?</span>
              <Link 
                to="/report" 
                className="text-indigo-400 font-bold flex items-center gap-1 hover:text-indigo-300 transition-all"
              >
                Go to Sandbox <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
