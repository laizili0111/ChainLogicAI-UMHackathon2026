"use client";

import { useState } from "react";
import { AlertTriangle, TrendingDown, CheckCircle, Database, ArrowRight, Code } from "lucide-react";

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
    <main className="app-container">
      {/* HEADER */}
      <header className="app-header">
        <div>
          <h1 className="app-title">ChainLogic AI</h1>
          <p className="app-subtitle">Decision Intelligence for Automotive SMEs</p>
        </div>
        <div className="status-badge">
          <Database size={16} /> ERP Connected: SQLite
        </div>
      </header>

      {/* THE INGESTION PANEL (Corporate Email) */}
      <section className="glass-panel ingestion-panel">
        <header className="panel-header">
          <div className="window-controls">
            <div className="control-dot dot-red"></div>
            <div className="control-dot dot-yellow"></div>
            <div className="control-dot dot-green"></div>
          </div>
          <span className="panel-label">Secure Mail Client</span>
        </header>

        <div className="email-meta">
          <div className="meta-row">
            <span className="meta-label">From:</span>
            <span className="meta-value">logistics@munich-precision.de</span>
          </div>
          <div className="meta-row mt">
            <span className="meta-label">Subject:</span>
            <span className="meta-value urgent">URGENT: Hamburg Port Strike - Shipment Delayed</span>
          </div>
        </div>

        <div className="email-body">
          <textarea
            className="email-textarea"
            rows={3}
            value={emailText}
            onChange={(e) => setEmailText(e.target.value)}
            spellCheck="false"
          />
        </div>

        <footer className="panel-footer">
          <p className="footer-note">
            * ChainLogic AI will parse this unstructured text, query the SQLite database, and calculate trade-offs.
          </p>
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? "Fusing Data..." : "Run Z.AI Decision Engine"}
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
          {/* DATA TRANSPARENCY TOGGLE */}
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

          {/* CRISIS ALERT BANNER */}
          <div className="crisis-banner">
            <AlertTriangle className="crisis-icon" size={32} />
            <div>
              <h2 className="crisis-title">CRITICAL DISRUPTION: {insight.crisis_analysis.affected_component.sku}</h2>
              <p className="crisis-desc">{insight.crisis_analysis.baseline_impact}</p>
            </div>
          </div>

          {/* TRADE-OFF OPTIONS */}
          <h3 className="section-title">AI Trade-off Analysis</h3>
          <div className="cards-grid">
            {insight.trade_off_options.map((option: TradeOffOption) => {
              const isRecommended = option.option_id === insight.glm_recommendation.primary_choice;
              
              return (
                <div 
                  key={option.option_id} 
                  className={`card ${isRecommended ? "recommended" : ""}`}
                >
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
                      <div className={`impact-value ${option.financial_impact.net_financial_impact < 0 ? 'negative' : 'neutral'}`}>
                        <TrendingDown size={28} />
                        ${Math.abs(option.financial_impact.net_financial_impact).toLocaleString()}
                      </div>
                      <div className="impact-label">Net Financial Impact</div>
                    </div>

                    <div className="card-reasoning">
                      <span className="reasoning-label">Z. AI Reasoning: </span>
                      {option.justification}
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
            })}
          </div>
        </div>
      )}
    </main>
  );
}
