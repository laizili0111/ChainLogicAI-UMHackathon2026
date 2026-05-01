"use client";

import { useState } from "react";
import { 
  AlertTriangle, 
  TrendingDown, 
  TrendingUp, 
  CheckCircle, 
  Database, 
  ArrowRight, 
  Code, 
  ChevronDown, 
  Info,
  ArrowLeft,
  Activity
} from "lucide-react";
import InboxView, { Email } from "./InboxView";

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
interface ComputationBreakdown { formula: string; math: string; source_attribution?: string; }
interface TradeOffOption { option_id: string; action: string; justification: string; financial_impact: FinancialImpact; computation_breakdown?: ComputationBreakdown; }
interface GlmRecommendation { primary_choice: string; explainability: string; confidence_score?: number; }
interface InsightData { 
  contextual_data_retrieved: ContextualData; 
  crisis_analysis: CrisisAnalysis; 
  trade_off_options: TradeOffOption[]; 
  glm_recommendation: GlmRecommendation; 
}

// --- SUB-COMPONENT: TRADE-OFF CARD ---
function TradeOffCard({ 
  option, 
  isRecommended, 
  executedOption, 
  handleExecute,
  contextualData 
}: { 
  option: TradeOffOption; 
  isRecommended: boolean; 
  executedOption: string | null;
  handleExecute: (id: string, text: string) => void;
  contextualData: ContextualData;
}) {
  const [showDetails, setShowDetails] = useState(false);

  // Use dynamic math breakdown from Z.AI if available
  const calculateMath = () => {
    if (option.computation_breakdown) {
      return {
        formula: option.computation_breakdown.formula,
        math: option.computation_breakdown.math,
        source_attribution: option.computation_breakdown.source_attribution || "ERP Extrapolation",
        justification: option.justification
      };
    }

    // Fallback if computation_breakdown is missing (e.g., from an older backend version or error state)
    return { 
      formula: "Dynamic breakdown unavailable", 
      math: `Net Impact: $${option.financial_impact.net_financial_impact.toLocaleString()}`, 
      source_attribution: "System Fallback",
      justification: option.justification 
    };
  };

  const details = calculateMath();

  return (
    <div className={`card ${isRecommended ? "recommended" : ""}`}>
      <div>
        {isRecommended && (
          <div className="badge-recommended">
            <CheckCircle size={12} /> RECOMMENDED
          </div>
        )}
        
        <h4 className="card-title">
          Option {option.option_id}: {option.action}
        </h4>
        
        <div className="card-impact">
          <div className={`impact-value ${option.financial_impact.net_financial_impact < 0 ? 'negative' : (option.financial_impact.net_financial_impact > 0 ? 'positive' : 'neutral')}`}>
            {option.financial_impact.net_financial_impact > 0 ? <TrendingUp size={28} /> : <TrendingDown size={28} />}
            ${Math.abs(option.financial_impact.net_financial_impact).toLocaleString()}
          </div>
          <div className="impact-label">Net Financial Impact</div>
        </div>

        <div className="card-reasoning">
          <span className="reasoning-label">Z.AI Reasoning: </span>
          {option.justification}
        </div>

        {/* TASK 3: Detailed Computation Accordion */}
        <button 
          className="btn-detail-toggle"
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails ? <Info size={14} /> : <ChevronDown size={14} className="chevron-icon" />}
          {showDetails ? "Hide Computation" : "View Detailed Computation"}
        </button>

        <div className={`detailed-computation ${showDetails ? "open" : ""}`}>
          <div className="computation-grid">
            <div className="comp-row">
              <span className="comp-label">Base Logic:</span>
              <span className="comp-value">{details.formula}</span>
            </div>
            <div className="comp-divider"></div>
            <div className="comp-row">
              <span className="comp-label">GLM Breakdown:</span>
              <span className="comp-value">{details.math}</span>
            </div>
            <div className="comp-row">
              <span className="comp-label">Attribution:</span>
              <span className="comp-value" style={{ color: '#60a5fa' }}>{details.source_attribution}</span>
            </div>
            <div className="comp-row">
              <span className="comp-label">ERP Context:</span>
              <span className="comp-value">{contextualData.sku} Stock: {contextualData.current_inventory}</span>
            </div>
            <div className="comp-divider"></div>
            <div className="comp-row comp-total">
              <span className="comp-label">Net Result:</span>
              <span className={`comp-value ${option.financial_impact.net_financial_impact > 0 ? 'text-positive' : (option.financial_impact.net_financial_impact < 0 ? 'text-negative' : '')}`}>
                ${option.financial_impact.net_financial_impact.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="card-actions">
        <button
          onClick={() => handleExecute(option.option_id, option.action)}
          disabled={executedOption !== null}
          className={`btn-execute ${executedOption === option.option_id ? "executed" : ""}`}
        >
          {executedOption === option.option_id ? "✓ ERP Updated" : "Execute Decision"}
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<"inbox" | "dashboard">("inbox");
  const [insight, setInsight] = useState<InsightData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeEmail, setActiveEmail] = useState<Email | null>(null);
  const [emailText, setEmailText] = useState("");
  const [executedOption, setExecutedOption] = useState<string | null>(null);

  const handleStartAnalysis = (email: Email) => {
    setActiveEmail(email);
    setEmailText(email.body);
    setView("dashboard");
    // Trigger analysis automatically
    performAnalysis(`Subject: ${email.subject}\n\n${email.body}`);
  };

  const performAnalysis = async (text: string) => {
    setLoading(true);
    setInsight(null);
    setExecutedOption(null);
    try {
      const response = await fetch("http://localhost:8000/api/analyze-crisis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trigger_text: text }),
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
        body: JSON.stringify({ option_id: option_id, sku: insight?.contextual_data_retrieved.sku || "AE-V8-SENS", action: action_text }),
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
    <main className="app-container">
      {/* HEADER */}
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          {view === "dashboard" && (
            <button className="action-btn" onClick={() => setView("inbox")} title="Back to Inbox">
              <ArrowLeft size={24} />
            </button>
          )}
          <div>
            <h1 className="app-title">ChainLogic AI</h1>
            <p className="app-subtitle">Decision Intelligence for Automotive SMEs</p>
          </div>
        </div>
        <div className="status-badge">
          <Database size={16} /> ERP Connected: SQLite
        </div>
      </header>

      {view === "inbox" ? (
        <InboxView onAnalyze={handleStartAnalysis} />
      ) : (
        <div className="dashboard-view">
          {/* THE INGESTION PANEL (Condensed for Dashboard) */}
          <section className="glass-panel ingestion-panel" style={{ marginBottom: '2rem' }}>
            <header className="panel-header">
              <div className="window-controls">
                <div className="control-dot dot-red"></div>
                <div className="control-dot dot-yellow"></div>
                <div className="control-dot dot-green"></div>
              </div>
              <span className="panel-label">Active Analysis Context</span>
            </header>

            <div className="email-meta">
              <div className="meta-row">
                <span className="meta-label">From:</span>
                <span className="meta-value">{activeEmail?.senderEmail || "logistics@munich-precision.de"}</span>
              </div>
              <div className="meta-row mt">
                <span className="meta-label">Subject:</span>
                <span className="meta-value urgent">{activeEmail?.subject || "URGENT: Disruption Alert"}</span>
              </div>
            </div>

            <div className="email-body" style={{ background: 'rgba(59, 130, 246, 0.05)' }}>
              <textarea
                className="email-textarea"
                rows={8}
                value={emailText}
                onChange={(e) => setEmailText(e.target.value)}
                spellCheck="false"
              />
            </div>

            <footer className="panel-footer">
              <div className="footer-note" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Activity size={14} /> {loading ? "AI is currently evaluating this disruption scenario." : (insight ? "Z.AI GLM analysis complete. Options formulated." : "Ready to analyze disruption scenario.")}
              </div>
              <button
                onClick={() => performAnalysis(`Subject: ${activeEmail?.subject || ''}\n\n${emailText}`)}
                disabled={loading}
                className="btn btn-primary"
              >
                {loading ? "Fusing Data..." : "Re-Run Analysis"}
                {!loading && <ArrowRight size={18} />}
              </button>
            </footer>
          </section>

          {/* AI PARSING LOADING STATE */}
          {loading && (
            <div className="loading-state">
              <div className="loader-icon">
                <div className="loader-ring"></div>
                <Database size={40} />
              </div>
              <h3 className="loading-title">Z.AI GLM is Processing</h3>
              <div className="loading-text">Querying SQLite & Formulating Trade-offs...</div>
            </div>
          )}

          {/* STRUCTURED OUTPUT & DATA TRANSPARENCY */}
          {insight && !loading && (
            <div>
              <details className="data-viewer">
                <summary className="viewer-summary">
                  <Code size={20} />
                  Data Pipeline Viewer
                </summary>
                <div className="viewer-content">
                  <p className="code-comment"># 1. Unstructured entity extracted: {insight.contextual_data_retrieved.sku}</p>
                  <p className="code-comment"># 2. Executing query: SELECT * FROM inventory WHERE sku = &apos;{insight.contextual_data_retrieved.sku}&apos;;</p>
                  <p className="code-comment"># 3. Data retrieved successfully:</p>
                  <p>{`{`}</p>
                  <p>&nbsp;&nbsp;&quot;current_stock&quot;: <span className="code-number">{insight.contextual_data_retrieved.current_inventory}</span>,</p>
                  <p>&nbsp;&nbsp;&quot;unit_cost&quot;: <span className="code-number">${insight.contextual_data_retrieved.unit_cost}</span>,</p>
                  <p>&nbsp;&nbsp;&quot;downtime_penalty_rate&quot;: <span className="code-number">${insight.contextual_data_retrieved.daily_penalty}/day</span></p>
                  <p>{`}`}</p>
                  <p className="code-success">STATUS: Data successfully fused with text prompt and sent to Z.AI GLM.</p>
                </div>
              </details>

              {insight.crisis_analysis.status === "SAFE" ? (
                <div className="safe-banner" style={{ display: 'flex', alignItems: 'center', background: 'rgba(34, 197, 94, 0.1)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(34, 197, 94, 0.3)', marginBottom: '2rem' }}>
                  <CheckCircle className="safe-icon" size={32} style={{ color: '#22c55e', marginRight: '1rem' }} />
                  <div>
                    <h2 className="safe-title" style={{ margin: 0, color: '#22c55e', fontSize: '1.25rem' }}>SAFE STATE: {insight.crisis_analysis.affected_component.sku}</h2>
                    <p className="safe-desc" style={{ margin: '0.5rem 0 0 0', color: '#e2e8f0', opacity: 0.9 }}>{insight.crisis_analysis.baseline_impact}</p>
                  </div>
                </div>
              ) : (
                <div className="crisis-banner">
                  <AlertTriangle className="crisis-icon" size={32} />
                  <div>
                    <h2 className="crisis-title">CRITICAL DISRUPTION: {insight.crisis_analysis.affected_component.sku}</h2>
                    <p className="crisis-desc">{insight.crisis_analysis.baseline_impact}</p>
                  </div>
                </div>
              )}

              {insight.trade_off_options && insight.trade_off_options.length > 0 && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 className="section-title">AI Trade-off Analysis</h3>
                    {insight.glm_recommendation.confidence_score && (
                      <div className="status-badge" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#93c5fd', border: '1px solid rgba(59, 130, 246, 0.4)' }}>
                        Confidence: {(insight.glm_recommendation.confidence_score * 100).toFixed(1)}%
                      </div>
                    )}
                  </div>
                  <div className="cards-grid">
                    {insight.trade_off_options.map((option: TradeOffOption) => (
                      <TradeOffCard 
                        key={option.option_id}
                        option={option}
                        isRecommended={option.option_id === insight.glm_recommendation.primary_choice}
                        executedOption={executedOption}
                        handleExecute={handleExecute}
                        contextualData={insight.contextual_data_retrieved}
                      />
                    ))}
                  </div>
                </>
              )}
              {insight.crisis_analysis.status === "SAFE" && (
                <div className="glass-panel" style={{ padding: '1.5rem', marginTop: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ margin: '0 0 0.5rem 0', color: '#60a5fa' }}>Z.AI System Recommendation</h3>
                      <p style={{ margin: 0, opacity: 0.9 }}>{insight.glm_recommendation.explainability}</p>
                    </div>
                    {insight.glm_recommendation.confidence_score && (
                      <div className="status-badge" style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#86efac', border: '1px solid rgba(34, 197, 94, 0.4)' }}>
                        Confidence: {(insight.glm_recommendation.confidence_score * 100).toFixed(1)}%
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
