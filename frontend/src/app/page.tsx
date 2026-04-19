"use client";

import { useState } from "react";
import { AlertTriangle, TrendingDown, CheckCircle, Package, Database, Code } from "lucide-react";
import LogisticsMap from "@/components/LogisticsMap";

// --- UPDATED TYPESCRIPT INTERFACES ---
interface ContextualData {
  sku: string;
  current_inventory: number;
  unit_cost: number;
  daily_penalty: number;
  database_status: string;
}
interface Component { sku: string; name: string; }
interface CrisisAnalysis { status: string; affected_component: Component; baseline_impact: string; }
interface FinancialImpact { net_financial_impact: number; }
interface TradeOffOption { option_id: string; action: string; justification: string; financial_impact: FinancialImpact; }
interface GlmRecommendation { primary_choice: string; explainability: string; }
interface InsightData { 
  contextual_data_retrieved: ContextualData; 
  crisis_analysis: CrisisAnalysis; 
  trade_off_options: TradeOffOption[]; 
  glm_recommendation: GlmRecommendation; 
}

export default function Dashboard() {
  const [insight, setInsight] = useState<InsightData | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [emailText, setEmailText] = useState(
    "URGENT from Driver Raj: Van 2 stuck in flash flood at Federal Highway. AC condenser broken. Carrying 200kg POULTRY-WHOLE-A. Waiting time estimated 3+ hours."
  );

  const [executedOption, setExecutedOption] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setInsight(null);
    try {
      const response = await fetch("http://localhost:8000/api/analyze-crisis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trigger_text: emailText }),
      });
      const data: InsightData = await response.json();
      setInsight(data);
    } catch (error) {
      console.error("Failed to connect to backend:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async (option_id: string, action_text: string) => {
    try {
      const response = await fetch("http://localhost:8000/api/execute-decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ option_id: option_id, sku: "AE-V8-SENS", action: action_text }),
      });
      const data = await response.json();
      if (data.status === "success") {
        setExecutedOption(option_id);
      }
    } catch (error) {
      console.error("Execution failed:", error);
    }
  };

  return (
    <main className="h-screen w-screen bg-slate-950 text-slate-300 flex overflow-hidden font-sans">
      
      {/* COLUMN 1: LIVE INGESTION FEED (LEFT) */}
      <div className="w-[400px] border-r border-slate-800 flex flex-col bg-slate-900 shrink-0 shadow-xl z-20">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-blue-500" />
            <h2 className="text-sm font-bold text-slate-100 tracking-wider">SECURE COMMS</h2>
          </div>
          <span className="flex items-center px-2 py-1 bg-green-500/10 text-green-400 text-[10px] font-bold rounded-full border border-green-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse"></span>
            LIVE
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 shadow-inner">
            <p className="text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Incoming Report</p>
            <div className="grid grid-cols-[50px_1fr] gap-1 mb-3 text-xs">
              <span className="text-slate-500 text-right mr-2 font-mono">FROM:</span>
              <span className="text-slate-300 font-medium">driver-app@chainlogistics.my</span>
              <span className="text-slate-500 text-right mr-2 font-mono">SUBJ:</span>
              <span className="text-red-400 font-bold">URGENT: DISRUPTION</span>
            </div>
            <textarea
              className="w-full h-32 p-3 bg-slate-900 border border-slate-700 rounded text-slate-300 text-sm focus:ring-1 focus:ring-blue-500 resize-none font-mono placeholder-slate-600"
              value={emailText}
              onChange={(e) => setEmailText(e.target.value)}
              spellCheck="false"
            />
          </div>

          <div className="bg-slate-800/30 p-4 border border-slate-800 rounded-lg">
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Z.AI Engine parses unstructured field reports and cross-references them with the SQLite ERP to generate actionable intelligence.
            </p>
            <button
              onClick={handleAnalyze}
              disabled={loading || insight !== null}
              className={`w-full py-3 rounded text-sm font-bold flex flex-col items-center justify-center transition-all ${
                loading 
                  ? "bg-slate-700 text-slate-400 cursor-wait" 
                  : insight !== null
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                  : "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]"
              }`}
            >
              {loading ? (
                <>
                  <Database className="w-5 h-5 mb-1 animate-pulse" />
                  <span>Processing with Z.AI...</span>
                </>
              ) : insight !== null ? (
                "Data Ingested"
              ) : (
                <>
                  <span className="flex items-center">
                    <Code className="w-4 h-4 mr-2" />
                    RUN DECISION ENGINE
                  </span>
                </>
              )}
            </button>
          </div>
          
          {/* DATA PIPELINE TERMINAL */}
          {insight && (
            <div className="mt-4 bg-[#0a0a0f] p-4 rounded-lg border border-slate-800 font-mono text-[11px] leading-tight text-emerald-500/80 shadow-inner">
              <p className="text-slate-500 mb-2">=== Z.AI INGESTION LOG ===</p>
              <p>{`> Extracted SKU: ${insight.contextual_data_retrieved.sku}`}</p>
              <p>{`> Querying ERP Inventory...`}</p>
              <p className="pl-3 text-blue-400">{`Stock: ${insight.contextual_data_retrieved.current_inventory} | Penalty: $${insight.contextual_data_retrieved.daily_penalty}/day`}</p>
              <p>{`> Formulating prompt...`}</p>
              <p className="text-yellow-500 mt-2">{`> WARNING: ${insight.crisis_analysis.baseline_impact}`}</p>
            </div>
          )}
        </div>
      </div>

      {/* COLUMN 2: LOGISTICS GRAPH (CENTER) */}
      <div className="flex-1 flex flex-col relative bg-[#0a0a0f] border-r border-slate-800 overflow-hidden z-10 shadow-inner">
        <div className="absolute top-6 left-6 z-10 bg-slate-900/80 p-3 rounded-lg border border-slate-800 backdrop-blur-sm">
          <h2 className="text-lg font-bold text-slate-200 tracking-wide">SUPPLY CHAIN TOPOLOGY</h2>
          <p className="text-[10px] text-blue-400 font-mono uppercase tracking-widest mt-1"><span className="inline-block w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse mr-1.5"></span>LIVE NETWORK STATE</p>
        </div>
        
        <div className="flex-1 w-full h-full">
           <LogisticsMap insight={insight} executedOption={executedOption} />
        </div>
      </div>

      {/* COLUMN 3: INTELLIGENCE CONSOLE (RIGHT) */}
      <div className="w-[450px] flex flex-col bg-slate-900 shrink-0 z-20 shadow-xl">
        <div className="p-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
          <h2 className="text-sm font-bold text-slate-100 tracking-wider flex items-center">
            <TrendingDown className="w-4 h-4 text-orange-500 mr-2" /> 
            AI COMMAND CONSOLE
          </h2>
          {insight && (
            <span className="text-[10px] font-mono text-slate-500 border border-slate-700 px-2 py-0.5 rounded bg-slate-900">
              {insight.crisis_analysis.status}
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col">
           {!insight && !loading && (
             <div className="flex-1 flex flex-col items-center justify-center opacity-40">
               <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-slate-500" />
               <p className="text-sm font-bold uppercase tracking-widest text-slate-400">Awaiting Event</p>
             </div>
           )}

           {loading && (
              <div className="flex-1 flex flex-col items-center justify-center animate-pulse">
                <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto mb-6"></div>
                <h3 className="text-lg font-bold text-blue-400 tracking-wide">Z.AI Processing</h3>
                <p className="text-xs text-slate-500 font-mono mt-3">Computing probabilistic trade-offs...</p>
              </div>
           )}

           {insight && !loading && (
             <div className="w-full flex-1 flex flex-col space-y-5 animate-in fade-in slide-in-from-bottom-6 duration-500">
               <div className="bg-red-500/5 border border-red-500/20 p-4 rounded-xl shadow-inner">
                  <h3 className="text-red-400 font-bold flex items-center text-sm mb-2">
                    <AlertTriangle className="w-4 h-4 mr-2" /> ALERT: {insight.crisis_analysis.affected_component.sku}
                  </h3>
                  <p className="text-xs text-red-300/80 leading-relaxed font-mono">
                    {insight.crisis_analysis.baseline_impact}
                  </p>
               </div>

               <div className="flex items-center justify-between mt-2">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Calculated Trade-Offs</h4>
                  <div className="h-px bg-slate-800 flex-1 ml-4"></div>
               </div>

               <div className="space-y-4">
                 {insight.trade_off_options.map((option: TradeOffOption) => {
                   const isRecommended = option.option_id === insight.glm_recommendation.primary_choice;
                   return (
                     <div 
                       key={option.option_id}
                       className={`relative rounded-xl p-5 border transition-all duration-300 ${
                         isRecommended 
                          ? "bg-[#101827] border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.15)]" 
                          : "bg-slate-900 border-slate-800 hover:border-slate-600"
                       }`}
                     >
                       {isRecommended && (
                         <div className="absolute -top-3 right-5 bg-blue-600 text-white text-[9px] font-bold px-2 py-1.5 rounded shadow-[0_0_10px_rgba(37,99,235,0.5)] uppercase tracking-widest flex items-center">
                           <CheckCircle className="w-3 h-3 mr-1.5" /> OPTIMAL
                         </div>
                       )}
                       
                       <h5 className="font-bold text-slate-200 text-sm mb-3">{option.action}</h5>
                       
                       <div className="flex justify-between items-end mb-4 bg-black/20 p-3 rounded-lg border border-slate-800">
                         <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold pb-1">Net Impact</span>
                         <span className={`text-xl font-black font-mono ${option.financial_impact.net_financial_impact < 0 ? 'text-orange-400' : 'text-slate-300'}`}>
                           {option.financial_impact.net_financial_impact < 0 ? '-' : ''}${Math.abs(option.financial_impact.net_financial_impact).toLocaleString()}
                         </span>
                       </div>

                       <div className="bg-slate-950 p-3 rounded-lg text-xs text-slate-400 border border-slate-800/50 mb-5 leading-relaxed relative overflow-hidden group">
                          <span className="text-blue-500 font-semibold mr-1.5">Z.AI:</span>
                          {option.justification}
                       </div>

                       <button
                          onClick={() => handleExecute(option.option_id, option.action)}
                          disabled={executedOption !== null}
                          className={`w-full py-3 rounded-lg text-xs font-bold transition-all duration-300 tracking-wider ${
                            executedOption === option.option_id
                              ? "bg-green-500/10 text-green-400 border border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.2)]"
                              : executedOption !== null
                              ? "bg-slate-800/50 text-slate-600 cursor-not-allowed"
                              : isRecommended
                              ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg hover:shadow-blue-500/25 translate-y-0 hover:-translate-y-0.5"
                              : "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:border-slate-500"
                          }`}
                        >
                          {executedOption === option.option_id ? "PARAMETERS EXECUTED" : "EXECUTE ACTION"}
                        </button>
                     </div>
                   );
                 })}
               </div>
             </div>
           )}
        </div>
      </div>

    </main>
  );
}
