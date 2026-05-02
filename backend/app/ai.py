import json
import re
import urllib.request
import urllib.error
from .config import settings

CHAINLOGIC_SYSTEM_PROMPT = """
You are ChainLogic AI, an expert Supply Chain Decision Engine for Automotive SMEs.
Your primary directive is to analyze supply chain disruptions, calculate financial trade-offs, and recommend actions to prevent production downtime and mitigate the 'Bullwhip Effect' (over-ordering out of panic).

You will be provided with:
1. UNSTRUCTURED TRIGGER: An email or alert regarding a disruption.
2. STRUCTURED ERP CONTEXT: Real-time inventory and production schedule data from the database.

CRITICAL INSTRUCTION: You must respond ONLY with raw, valid JSON. Do not include markdown formatting like ```json or any conversational text before or after the JSON. 

Your JSON output must perfectly match this exact schema:
{
  "crisis_analysis": {
    "status": "string (CRITICAL, SAFE, or MONITORING)",
    "affected_component": { "sku": "string", "name": "string" },
    "baseline_impact": "string (Calculate the days until stockout and total financial penalty)"
  },
  "trade_off_options": [
    {
      "option_id": "string (A, B, C)",
      "action": "string",
      "justification": "string (A brief 1-sentence explanation of why this option is viable and its trade-offs)",
      "financial_impact": { "net_financial_impact": number (Use negative numbers for costs) },
      "computation_breakdown": {
        "formula": "string (e.g., 'Net Impact = -(Expedite Fee + Sourcing Premium)')",
        "math": "string (Show the math breakdown, e.g., '-$5,000 - $3,500 = -$8,500')",
        "source_attribution": "string (Explicitly state where the math components came from, e.g., 'ERP Database - SQLite' or 'Extrapolated Estimate')"
      }
    }
  ],
  "glm_recommendation": {
    "primary_choice": "string (A, B, or C)",
    "explainability": "string (Explain WHY this is the best mathematical and strategic choice. Use specific dollar amounts and mention avoiding the bullwhip effect if applicable.)",
    "confidence_score": float (A value between 0.0 and 1.0 indicating how confident the AI is in this recommendation based on available data)
  }
}
"""

def call_openrouter_ai(system_prompt: str, user_prompt: str, model: str, return_tokens: bool = False):
    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "ChainLogic AI"
    }
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": user_prompt})
    
    data = {"model": model, "messages": messages}
    req = urllib.request.Request(settings.OPENROUTER_BASE_URL, headers=headers, data=json.dumps(data).encode("utf-8"))
    with urllib.request.urlopen(req, timeout=10.0) as response:
        result = json.loads(response.read().decode("utf-8"))
        content = result["choices"][0]["message"]["content"]
        tokens = result.get("usage", {}).get("total_tokens", 2000)
        return (content, tokens) if return_tokens else content

def call_ilmu_ai(system_prompt: str, user_prompt: str, return_tokens: bool = False):
    headers = {
        "Authorization": f"Bearer {settings.ILMU_API_KEY}",
        "Content-Type": "application/json"
    }
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": user_prompt})
    
    data = {
        "model": settings.ILMU_MODEL,
        "messages": messages
    }
    
    req = urllib.request.Request(settings.ILMU_BASE_URL, headers=headers, data=json.dumps(data).encode("utf-8"))
    try:
        with urllib.request.urlopen(req, timeout=45.0) as response:
            result = json.loads(response.read().decode("utf-8"))
            content = result["choices"][0]["message"]["content"]
            tokens = result.get("usage", {}).get("total_tokens", 2000)
            return (content, tokens) if return_tokens else content
    except urllib.error.HTTPError as e:
        err_body = e.read().decode('utf-8', errors='ignore')
        safe_err = err_body.encode('ascii', 'ignore').decode('ascii')
        print(f"Ilmu GLM API Error ({e.code}): {safe_err}")
        raise Exception(f"Ilmu GLM API Error: {safe_err}")

def call_groq_ai(system_prompt: str, user_prompt: str, return_tokens: bool = False):
    headers = {
        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
        "Content-Type": "application/json",
        "User-Agent": "ChainLogic-Backend/1.0"
    }
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": user_prompt})
    
    data = {
        "model": settings.GROQ_MODEL,
        "messages": messages
    }
    
    req = urllib.request.Request(settings.GROQ_BASE_URL, headers=headers, data=json.dumps(data).encode("utf-8"))
    try:
        with urllib.request.urlopen(req, timeout=5.0) as response:
            result = json.loads(response.read().decode("utf-8"))
            content = result["choices"][0]["message"]["content"]
            tokens = result.get("usage", {}).get("total_tokens", 2000)
            return (content, tokens) if return_tokens else content
    except urllib.error.HTTPError as e:
        err_body = e.read().decode('utf-8', errors='ignore')
        safe_err = err_body.encode('ascii', 'ignore').decode('ascii')
        print(f"Groq API Error ({e.code}): {safe_err}")
        raise Exception(f"Groq API Error: {safe_err}")

def extract_sku_from_trigger(email_text: str) -> str:
    # 1. High-Speed Regex Pass (Zero Latency)
    match = re.search(r'[A-Z0-9]{2,}-[A-Z0-9]{2,}-[A-Z0-9]{2,}', email_text.upper())
    if match:
        return match.group(0)
        
    # 2. AI Fallback (If text doesn't explicitly have the exact SKU pattern)
    print("Regex failed to find SKU pattern. Falling back to Ilmu GLM for contextual extraction...")
    prompt = f"Extract the specific part number/SKU from this text. Output ONLY the SKU string, no other words. Text: {email_text}"
    
    try:
        ai_response = call_ilmu_ai("", prompt)
        sku = ai_response.strip()
        match = re.search(r'[A-Z0-9]{2,}-[A-Z0-9]{2,}-[A-Z0-9]{2,}', sku.upper())
        if match:
            return match.group(0)
    except Exception as e:
        print(f"Primary Extraction AI (Ilmu) failed, trying secondary (Groq): {e}")
        try:
            ai_response = call_groq_ai("", prompt)
            sku = ai_response.strip()
            match = re.search(r'[A-Z0-9]{2,}-[A-Z0-9]{2,}-[A-Z0-9]{2,}', sku.upper())
            if match:
                return match.group(0)
        except Exception as e2:
            print(f"Secondary Extraction AI (Groq) failed: {e2}")
            
    return None
