from pydantic import BaseModel
from typing import List, Optional, Dict, Any

# Incoming Request Schemas
class AnalyzeCrisisRequest(BaseModel):
    trigger_text: str

class ExecuteDecisionRequest(BaseModel):
    option_id: str
    sku: str
    action: str = "AI Automated Adjustment"
    financial_impact: float = 0.0

# Contextual Data Schema
class ContextualData(BaseModel):
    sku: str
    part_name: str
    current_inventory: int
    unit_cost: float
    daily_penalty: float
    required_quantity: int
    database_status: str
    tokens_used: Optional[int] = 2000

# AI Response Schemas
class AffectedComponent(BaseModel):
    sku: str
    name: str

class CrisisAnalysis(BaseModel):
    status: str
    affected_component: AffectedComponent
    baseline_impact: str

class FinancialImpact(BaseModel):
    net_financial_impact: float

class ComputationBreakdown(BaseModel):
    formula: str
    math: str
    source_attribution: str

class TradeOffOption(BaseModel):
    option_id: str
    action: str
    justification: str
    financial_impact: FinancialImpact
    computation_breakdown: Optional[ComputationBreakdown] = None

class GlmRecommendation(BaseModel):
    primary_choice: str
    explainability: str
    confidence_score: float
    model_used: Optional[str] = "Zhipu GLM-5.1"

class AIAnalysisResponse(BaseModel):
    crisis_analysis: CrisisAnalysis
    trade_off_options: List[TradeOffOption]
    glm_recommendation: GlmRecommendation
    contextual_data_retrieved: Optional[ContextualData] = None

class ExecuteDecisionResponse(BaseModel):
    status: str
    message: str
    new_state: Optional[Dict[str, Any]] = None
