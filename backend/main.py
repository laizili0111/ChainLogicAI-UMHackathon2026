import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sqlite3
import json
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

client = OpenAI(
  base_url="https://api.groq.com/openai/v1",
  api_key=GROQ_API_KEY,
  timeout=30.0,
  max_retries=1,
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def setup_database():
    conn = sqlite3.connect('chainlogic_erp.db')
    c = conn.cursor()
    c.execute("DROP TABLE IF EXISTS inventory")
    c.execute('''
        CREATE TABLE IF NOT EXISTS system_entities (
            id TEXT PRIMARY KEY,
            domain TEXT,
            entity_type TEXT,
            entity_name TEXT,
            attributes JSON
        )
    ''')
    conn.commit()
    conn.close()

setup_database()

class LedgerRequest(BaseModel):
    document_text: str
    active_plugins: list[str] = []
    custom_context_notes: str = ""

class ExecuteRequest(BaseModel):
    option_id: str
    sku: str
    action: str

class InitializeErpRequest(BaseModel):
    universal_truth: str

@app.post("/api/initialize-erp")
async def initialize_erp(request: InitializeErpRequest):
    prompt = f"""
    The user is setting up a Zero-Setup ERP system for their business.
    Their core business reality context is: "{request.universal_truth}"
    
    You must define the initial core entities for their business using an Entity-Attribute-Value pattern.
    Return ONLY a valid JSON array of objects. Do NOT wrap in markdown array ticks like ```json.
    
    Each object MUST have EXACTLY these fields:
    - "id": a unique string ID
    - "domain": a string (e.g., "logistics", "finance", "freelance", "hospitality")
    - "entity_type": a string (e.g., "inventory", "client", "project", "asset")
    - "entity_name": a descriptive name
    - "attributes": a JSON object with key-value descriptors (e.g., quantity, rate, status, spoilage_risk)
    
    Create exactly 3-5 high-quality, relevant core entities based on their description.
    """
    
    try:
        response = client.chat.completions.create(
          model="llama-3.3-70b-versatile",
          messages=[
            {"role": "system", "content": "You are an expert Database Administrator."},
            {"role": "user", "content": prompt}
          ]
        )
        raw = response.choices[0].message.content
        start = raw.find('[')
        end = raw.rfind(']') + 1
        if start != -1 and end != 0:
            raw = raw[start:end]
        else:
            raw = raw.replace("```json", "").replace("```", "").strip()
            
        entities = json.loads(raw)
        
        conn = sqlite3.connect('chainlogic_erp.db')
        c = conn.cursor()
        c.execute("DELETE FROM system_entities") # wipe old state
        
        for e in entities:
            # Handle potential nested dicts securely via json.dumps
            attrs = e.get("attributes", {})
            attr_str = json.dumps(attrs) if isinstance(attrs, dict) else str(attrs)
            
            c.execute(
                "INSERT INTO system_entities (id, domain, entity_type, entity_name, attributes) VALUES (?, ?, ?, ?, ?)",
                (e.get("id", str(hash(e.get("entity_name")))), e.get("domain", "default"), e.get("entity_type", "entity"), e.get("entity_name", "Unnamed"), attr_str)
            )
        conn.commit()
        conn.close()
        return {"status": "success", "entities": entities}
    except Exception as e:
        print("Failed to parse schema init: ", e)
        raise HTTPException(status_code=500, detail="AI failed to build schema")

@app.post("/api/generate-ledger-plan")
async def generate_ledger_plan(request: LedgerRequest):
    conn = sqlite3.connect('chainlogic_erp.db')
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM system_entities")
    rows = c.fetchall()
    
    # Unpack EAV JSON attributes back into query payload safely
    erp_data = []
    for r in rows:
        d = dict(r)
        if isinstance(d.get('attributes'), str):
            try:
                d['attributes'] = json.loads(d['attributes'])
            except:
                pass
        erp_data.append(d)
    
    conn.close()

    plugin_context = ""
    map_schema_str = ""
    if "weather" in request.active_plugins:
        plugin_context += "WEATHER API: Severe thunderstorm warning active across the region. Transport speeds reduced by 40%.\n"
    if "traffic" in request.active_plugins:
        plugin_context += "TRAFFIC API: Federal Highway is backed up by 5km due to a localized accident.\n"
    if "holiday" in request.active_plugins:
        plugin_context += "CAMPUS CALENDAR API: Awal Muharram public holiday in effect. End-user traffic is currently down 85%.\n"
    
    if "routing" in request.active_plugins:
        plugin_context += "ROUTING ENGINE API: The user explicitly requires a geographic map block to visualize logistics route.\n"
        map_schema_str = '\n5. { "type": "map", "data": { "status": "incident" | "normal" } } (Required since the routing plugin is active)'
    else:
        plugin_context += "ROUTING RULE: Do NOT generate a 'map' block. The user has not requested map routing.\n"

    system_instruction = f"""
You are Z.AI, the Agentic Reasoner internally powering the 'ChainLogic' Smart Ledger for SMEs.
You must analyze the user's operational notes in the context of their active plugins and dynamically generated ERP SQLite database records.

Provide an actionable operations plan by emitting specifically formatted UI block objects.
You have maximum flexibility to construct the UI response by stacking ANY combination of the following block types into the `blocks` array. 
Choose ONLY the blocks that strategically make sense for the current situation. 
- If the user is just asking for advice or leaving a minor note, use simple `text` blocks.
- If it is a critical emergency, use `alert` and `action_cards`.
- If actionable buttons are not needed, DO NOT output `action_cards`.
The frontend UI will dynamically render exactly the sequence of blocks you choose to array.

Available Block schemas:
1. {{ "type": "text", "content": "..." }} (Standard analysis, advice, and insights)
2. {{ "type": "alert", "content": "..." }} (Use ONLY for critical, urgent warnings or SLA breaches)
3. {{ "type": "metric", "data": {{ "target": "...", "savings": "...", "reason": "..." }} }} (KPI tracking)
4. {{ "type": "action_cards", "options": [ {{ "id": "A", "action": "...", "justification": "...", "impact": <integer_currency>, "recommended": true|false }} ] }} (IMPORTANT: Mark EXACTLY ONE option as recommended: true — the one you deem most optimal given the context. All others must be recommended: false){map_schema_str}

You MUST reply with JSON matching this exact structure:

{{
  "ledger_date": "YYYY-MM-DD",
  "blocks": [
     // INSERT ANY DYNAMIC NUMBER AND COMBINATION OF THE AVAILABLE BLOCKS HERE THAT FITS THE SITUATION
  ]
}}

DO NOT include markdown block formatting (e.g., ```json). Return ONLY pure JSON text.
CRITICAL RULE: DO NOT hypothesize or hallucinate specific names (e.g., "Client B", "Supplier A") UNLESS they are explicitly written in the USER DOCUMENT TEXT. Keep inferences perfectly generalized or exactly literal to the text.
CRITICAL FOCUS RULE: The USER DOCUMENT TEXT contains a full chronological log. Your response must ONLY analyze and act on the FINAL/MOST RECENT log entry. Do NOT re-summarize previous entries. Treat prior log entries as established background context only.
CRITICAL NUMBERS RULE: When the user mentions rates, hours, percentages or financial impacts, you MUST calculate exact dollar amounts using data from the ERP database. Show the math result, not just the input (e.g., '4 extra hours x $100/hr = $400 cost overrun', '10% of $12,000 = $1,200 reduction').
"""
    
    prompt = ""
    if request.custom_context_notes:
        prompt += f"CRITICAL HUMAN OVERRIDE CONTEXT:\n{request.custom_context_notes}\n(You MUST prioritize this human context above ERP database constraints when generating the operational plan metrics and justifications.)\n\n"
        
    prompt += f"LIVE EAV DATABASE RECORD:\n{json.dumps(erp_data)}\n\n"
    if plugin_context:
        prompt += f"LIVE DATA API CONTEXTS (Extremely Important):\n{plugin_context}\n\n"
    prompt += f"USER DOCUMENT TEXT:\n{request.document_text}"

    try:
        response = client.chat.completions.create(
          model="llama-3.3-70b-versatile",
          messages=[
            {"role": "system", "content": system_instruction},
            {"role": "user", "content": prompt}
          ]
        )
        raw_text = response.choices[0].message.content
        start = raw_text.find('{')
        end = raw_text.rfind('}') + 1
        if start != -1 and end != 0:
            raw_text = raw_text[start:end]
        else:
            raw_text = raw_text.replace("```json", "").replace("```", "").strip()
            
        data = json.loads(raw_text)
        return data
    except Exception as e:
        error_msg = str(e)
        print("GENERATE_CONTENT ERROR:", error_msg)
        if "429" in error_msg:
             raise HTTPException(status_code=429, detail="API Quota Exceeded. Please wait before generating again.")
        raise HTTPException(status_code=500, detail=f"Generation failed: {error_msg}")

@app.post("/api/execute-decision")
async def execute_decision(request: ExecuteRequest):
    return {"status": "success", "message": f"Executed action {request.action}"}
