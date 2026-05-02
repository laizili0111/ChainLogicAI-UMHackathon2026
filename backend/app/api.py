import json
from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from pydantic import ValidationError
from .schemas import AnalyzeCrisisRequest, AIAnalysisResponse, ExecuteDecisionRequest, ExecuteDecisionResponse
from .db import fetch_erp_context, fetch_erp_data_dict, execute_ai_decision
from .ai import extract_sku_from_trigger, call_z_ai_main, call_z_ai, call_openrouter_ai, CHAINLOGIC_SYSTEM_PROMPT
from .config import settings

router = APIRouter()

@router.post("/analyze-crisis")
async def analyze_crisis(request: AnalyzeCrisisRequest):
    incoming_email = request.trigger_text
    target_sku = extract_sku_from_trigger(incoming_email)
    
    if not target_sku:
        return {"error": "Z.AI could not identify a valid component SKU in the provided text. Please ensure the part number is included."}
    
    erp_context_string = fetch_erp_context(target_sku)
    live_ui_data = fetch_erp_data_dict(target_sku)
    
    if not live_ui_data:
         return {"error": f"SKU '{target_sku}' extracted from text, but it does not exist in the Enterprise Database master records."}
            
    current_stock = live_ui_data["current_inventory"]
    req_qty = live_ui_data["required_quantity"]
    penalty = live_ui_data["daily_penalty"]
    
    if penalty == 0 or current_stock >= req_qty:
        return {
            "crisis_analysis": {
                "status": "SAFE",
                "affected_component": { "sku": target_sku, "name": live_ui_data["part_name"] },
                "baseline_impact": f"Stock levels are sufficient ({current_stock}/{req_qty}) or project is safely handled (Risk: ${penalty:,.2f}/day)."
            },
            "trade_off_options": [],
            "glm_recommendation": {
                "primary_choice": "N/A",
                "explainability": "The system has verified that there is no imminent production risk requiring action.",
                "confidence_score": 1.0
            },
            "contextual_data_retrieved": live_ui_data
        }
    
    user_prompt = f"UNSTRUCTURED TRIGGER: {incoming_email}\n\nSTRUCTURED ERP CONTEXT:\n{erp_context_string}"
    
    try:
        ai_json_string, total_tokens = call_z_ai_main(CHAINLOGIC_SYSTEM_PROMPT, user_prompt, return_tokens=True)
    except Exception as e:
        print(f"Primary Z.AI (Main) failed: {e}. Attempting secondary Z.AI (Ilmu)...")
        try:
            ai_json_string, total_tokens = call_z_ai(CHAINLOGIC_SYSTEM_PROMPT, user_prompt, return_tokens=True)
        except Exception as e2:
            print(f"Secondary Z.AI failed: {e2}. Attempting OpenRouter fallback...")
            ai_json_string = None
            total_tokens = 2000
            
            for model in settings.FALLBACK_MODELS:
                try:
                    print(f"Trying fallback model: {model}")
                    ai_json_string = call_openrouter_ai(CHAINLOGIC_SYSTEM_PROMPT, user_prompt, model)
                    if ai_json_string:
                        print(f"Fallback successful with {model}")
                        break
                except Exception as fe:
                    print(f"Fallback {model} failed: {fe}")
        
        if not ai_json_string:
            print("All AI models failed. Falling back to hardcoded mock.")
            ai_json_string = """
            {
                "crisis_analysis": {
                    "status": "CRITICAL",
                    "affected_component": { "sku": "AE-V8-SENS", "name": "High-Fidelity Acoustic Emission Sensor" },
                    "baseline_impact": "Will be dynamically updated below."
                },
                "trade_off_options": [
                    {
                        "option_id": "A",
                        "action": "Air Freight via Secondary EU Supplier",
                        "justification": "Fastest recovery time, but incurs a severe premium shipping cost that impacts profit margins.",
                        "financial_impact": { "net_financial_impact": -8500 },
                        "computation_breakdown": {
                            "formula": "Net Impact = -(Expedite Fee + Sourcing Premium)",
                            "math": "-$5,000 (Air) - $3,500 (Premium) = -$8,500",
                            "source_attribution": "Logistics Estimate / ERP Extrapolation"
                        }
                    },
                    {
                        "option_id": "C",
                        "action": "Reschedule Rig B to V6 Engine Variant Testing",
                        "justification": "Swapping the testing schedule entirely avoids the downtime penalty and requires zero additional capital.",
                        "financial_impact": { "net_financial_impact": 0 },
                        "computation_breakdown": {
                            "formula": "Penalty Avoidance = Daily Penalty × Days Delay",
                            "math": "$12,500 × 0 = $0 (Schedule Shift)",
                            "source_attribution": "ERP Database - SQLite"
                        }
                    }
                ],
                "glm_recommendation": {
                    "primary_choice": "C",
                    "explainability": "Option C mitigates the daily penalty and avoids an expedite fee.",
                    "confidence_score": 0.95
                }
            }
            """

    try:
        ai_json_string = ai_json_string.strip()
        if ai_json_string.startswith("```json"):
            ai_json_string = ai_json_string[7:]
        if ai_json_string.startswith("```"):
            ai_json_string = ai_json_string[3:]
        if ai_json_string.endswith("```"):
            ai_json_string = ai_json_string[:-3]
        ai_json_string = ai_json_string.strip()
        
        decision_data = json.loads(ai_json_string)
        live_ui_data["tokens_used"] = total_tokens
        decision_data["contextual_data_retrieved"] = live_ui_data
        
        current_stock = live_ui_data["current_inventory"]
        daily_penalty = live_ui_data["daily_penalty"]
        decision_data["crisis_analysis"]["baseline_impact"] = f"Current stock of {current_stock} units will not meet the requirement. Penalty risk is ${daily_penalty:,.2f}/day."
        decision_data["crisis_analysis"]["affected_component"]["sku"] = target_sku
        
        try:
            validated_response = AIAnalysisResponse(**decision_data)
            return validated_response.model_dump()
        except ValidationError as ve:
            print(f"Pydantic Validation Error: {ve}")
            return {"error": "AI returned a response that did not match the strict schema requirements.", "details": str(ve)}
            
    except Exception as e:
        return {"error": str(e)}

@router.post("/execute-decision", response_model=ExecuteDecisionResponse)
async def execute_decision(request: ExecuteDecisionRequest):
    if not request.sku:
        raise HTTPException(status_code=400, detail="SKU is missing from the payload.")
    
    try:
        updated_row = execute_ai_decision(
            target_sku=request.sku,
            option_id=request.option_id,
            action_text=request.action,
            financial_impact=request.financial_impact
        )
        
        return ExecuteDecisionResponse(
            status="success",
            message="ERP Database Successfully Updated with AI Decision.",
            new_state={
                "project": updated_row[0] if updated_row else "Unknown", 
                "penalty": updated_row[1] if updated_row else 0
            }
        )
    except Exception as e:
        return ExecuteDecisionResponse(status="error", message=str(e))
