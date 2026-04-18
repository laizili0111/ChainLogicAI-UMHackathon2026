"use client";

import { useState } from "react";
import { AlertTriangle, TrendingDown, CheckCircle, Package, Database, ArrowRight, Code } from "lucide-react";

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
    "URGENT from Munich Precision: Customs strike at Hamburg port. Shipment of 40 AE-V8-SENS units delayed by 14 days. Please advise."
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
    <main className="min-h-screen bg-gray-50 p-8">
      {/* HEADER */}
      <div className="mb-8 flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">ChainLogic AI</h1>
          <p className="text-sm text-slate-500 mt-1">Decision Intelligence for Automotive SMEs</p>
        </div>
        <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-800 flex items-center">
          <Database className="w-4 h-4 mr-2" /> ERP Connected: SQLite
        </span>
      </div>

      {/* THE INGESTION PANEL (Corporate Email) */}
      <div className="mb-8 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
        <div className="bg-gray-100 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <div className="flex space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-400"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
            <div className="w-3 h-3 rounded-full bg-green-400"></div>
          </div>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Secure Mail Client</span>
        </div>

        <div className="border-b border-gray-100 bg-white p-4 text-sm">
          <div className="grid grid-cols-[80px_1fr] gap-2 mb-1">
            <span className="font-bold text-gray-500 text-right">From:</span>
            <span className="text-gray-900 font-medium">logistics@munich-precision.de</span>
          </div>
          <div className="grid grid-cols-[80px_1fr] gap-2 mt-3 pt-3 border-t border-gray-50">
            <span className="font-bold text-gray-500 text-right">Subject:</span>
            <span className="text-red-600 font-bold">URGENT: Hamburg Port Strike - Shipment Delayed</span>
          </div>
        </div>

        <div className="p-4 bg-yellow-50/30">
          <textarea
            className="w-full resize-none border-0 bg-transparent text-gray-800 focus:ring-0 text-base leading-relaxed"
            rows={3}
            value={emailText}
            onChange={(e) => setEmailText(e.target.value)}
            spellCheck="false"
          />
        </div>

        <div className="bg-gray-50 p-4 border-t border-gray-200 flex items-center justify-between">
          <p className="text-xs text-gray-500 max-w-md">
            * ChainLogic AI will parse this unstructured text, query the SQLite database, and calculate trade-offs.
          </p>
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="group relative flex items-center justify-center overflow-hidden rounded-lg bg-blue-600 px-6 py-2.5 font-bold text-white transition-all hover:bg-blue-700 disabled:opacity-80"
          >
            {loading ? "Fusing Data..." : "Run Z.AI Decision Engine"} 
            {!loading && <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />}
          </button>
        </div>
      </div>

      {/* AI PARSING LOADING STATE */}
      {loading && (
        <div className="my-16 flex flex-col items-center justify-center">
          <div className="relative flex h-20 w-20 items-center justify-center mb-6">
            <Database className="absolute h-8 w-8 text-blue-400 animate-pulse" />
          </div>
          <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight">Z.AI GLM is Processing</h3>
          <div className="mt-4 text-sm font-medium text-blue-600">Querying SQLite & Formulating Trade-offs...</div>
        </div>
      )}

      {/* STRUCTURED OUTPUT & DATA TRANSPARENCY */}
      {insight && !loading && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* ---> NEW: METHOD 2 DATA TRANSPARENCY TOGGLE <--- */}
          <div className="mb-6 rounded-lg border border-slate-300 bg-white shadow-sm overflow-hidden">
            <details className="group">
              <summary className="flex cursor-pointer items-center bg-slate-100 p-4 font-semibold text-slate-700 hover:bg-slate-200 transition">
                <Code className="mr-2 h-5 w-5 text-slate-600" />
                Data Pipeline Viewer
              </summary>
              <div className="p-4 bg-slate-900 text-green-400 font-mono text-sm overflow-x-auto">
                <p className="text-slate-400"># 1. Unstructured entity extracted: {insight.contextual_data_retrieved.sku}</p>
                <p className="text-slate-400"># 2. Executing query: SELECT * FROM inventory WHERE sku = &apos;{insight.contextual_data_retrieved.sku}&apos;;</p>
                <p className="text-slate-400 mb-2"># 3. Data retrieved successfully:</p>
                <p>{`{`}</p>
                <p className="pl-4">&quot;current_stock&quot;: <span className="text-yellow-300">{insight.contextual_data_retrieved.current_inventory}</span>,</p>
                <p className="pl-4">&quot;unit_cost&quot;: <span className="text-yellow-300">${insight.contextual_data_retrieved.unit_cost}</span>,</p>
                <p className="pl-4">&quot;downtime_penalty_rate&quot;: <span className="text-yellow-300">${insight.contextual_data_retrieved.daily_penalty}/day</span></p>
                <p>{`}`}</p>
                <p className="mt-2 text-blue-400">STATUS: Data successfully fused with text prompt and sent to Z.AI GLM.</p>
              </div>
            </details>
          </div>

          {/* CRISIS ALERT BANNER */}
          <div className="mb-6 rounded-lg border-l-4 border-red-600 bg-red-50 p-6 shadow-sm">
            <div className="flex items-center">
              <AlertTriangle className="mr-3 h-6 w-6 text-red-600" />
              <h2 className="text-xl font-bold text-red-900">CRITICAL DISRUPTION: {insight.crisis_analysis.affected_component.sku}</h2>
            </div>
            <p className="mt-2 text-red-800">{insight.crisis_analysis.baseline_impact}</p>
          </div>

          {/* TRADE-OFF OPTIONS */}
          <h3 className="mb-4 text-xl font-semibold text-slate-800">AI Trade-off Analysis</h3>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {insight.trade_off_options.map((option: TradeOffOption) => {
              const isRecommended = option.option_id === insight.glm_recommendation.primary_choice;
              
              return (
                <div 
                  key={option.option_id} 
                  // Notice we added flex layout here so the button stays pushed to the bottom!
                  className={`relative flex flex-col justify-between rounded-xl border p-6 shadow-sm transition-all ${
                    isRecommended ? "border-green-500 bg-green-50 ring-2 ring-green-500" : "border-gray-200 bg-white"
                  }`}
                >
                  {/* TOP HALF OF THE CARD */}
                  <div>
                    {isRecommended && (
                      <div className="absolute -top-3 left-4 flex items-center rounded-full bg-green-600 px-3 py-1 text-xs font-bold text-white shadow">
                        <CheckCircle className="mr-1 h-3 w-3" /> RECOMMENDED
                      </div>
                    )}
                    
                    <h4 className="mt-2 text-lg font-bold text-gray-900">
                      Option {option.option_id}: {option.action}
                    </h4>
                    
                    <div className="mt-4 flex items-center text-2xl font-black text-gray-900">
                      <TrendingDown className={`mr-2 h-6 w-6 ${option.financial_impact.net_financial_impact < 0 ? 'text-red-500' : 'text-gray-400'}`} />
                      ${Math.abs(option.financial_impact.net_financial_impact).toLocaleString()}
                    </div>
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">Net Financial Impact</p>

                    <div className="mt-4 rounded bg-slate-50 p-3 text-sm text-slate-700 border border-slate-100">
                      <span className="font-semibold text-slate-900">Z. AI Reasoning: </span>
                      {option.justification}
                    </div>
                  </div>

                  {/* BOTTOM HALF OF THE CARD: EXECUTE BUTTON */}
                  <div className="mt-6 border-t border-gray-200/60 pt-4">
                    <button
                      onClick={() => handleExecute(option.option_id, option.action)}
                      disabled={executedOption !== null}
                      className={`w-full rounded-md py-2.5 font-bold transition-all duration-200 ${
                        executedOption === option.option_id
                          ? "bg-green-600 text-white shadow-inner"
                          : executedOption !== null
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed opacity-70"
                          : isRecommended
                          ? "bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg translate-y-0 hover:-translate-y-0.5"
                          : "bg-white border-2 border-gray-200 text-gray-700 hover:border-blue-600 hover:text-blue-600"
                      }`}
                    >
                      {executedOption === option.option_id ? "✓ ERP Updated" : "Execute Decision"}
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
}
