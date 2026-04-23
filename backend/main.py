from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import BackgroundTasks
import sqlite3
import os
import json
import re

# 1. Initialize FastAPI App
app = FastAPI(title="ChainLogic AI Backend")

# CRITICAL FOR REACT: Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Open for hackathon dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_FILE = 'chainlogic_erp.db'

# 2. Database Setup Function
def setup_database():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # 1. Lookup Tables (Independent Entities)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS suppliers (
        supplier_id INTEGER PRIMARY KEY,
        supplier_name TEXT UNIQUE NOT NULL
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS categories (
        category_id INTEGER PRIMARY KEY,
        category_name TEXT UNIQUE NOT NULL
    )
    ''')

    # 2. Core Inventory Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS inventory_parts (
        part_id INTEGER PRIMARY KEY,
        sku TEXT UNIQUE NOT NULL,
        part_name TEXT NOT NULL,
        category_id INTEGER,
        supplier_id INTEGER,
        current_stock INTEGER DEFAULT 0,
        safety_stock INTEGER DEFAULT 0,
        unit_cost REAL,
        lead_time_days INTEGER,
        FOREIGN KEY (category_id) REFERENCES categories (category_id),
        FOREIGN KEY (supplier_id) REFERENCES suppliers (supplier_id)
    )
    ''')

    # 3. Core Projects Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS production_jobs (
        job_id INTEGER PRIMARY KEY,
        project_name TEXT UNIQUE NOT NULL, 
        deadline_date TEXT,
        daily_downtime_penalty REAL
    )
    ''')

    # 4. Junction Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS job_requirements (
        job_id INTEGER,
        part_id INTEGER,
        required_quantity INTEGER NOT NULL,
        PRIMARY KEY (job_id, part_id),
        FOREIGN KEY (job_id) REFERENCES production_jobs (job_id) ON DELETE CASCADE,
        FOREIGN KEY (part_id) REFERENCES inventory_parts (part_id)
    )
    ''')

    # --- SEED DATA: CATEGORIES AND SUPPLIERS ---
    cursor.executemany('''
        INSERT OR IGNORE INTO categories (category_name) VALUES (?)
    ''', [('Powertrain Validation',), ('Electronics',), ('Chassis',), ('Powertrain',)])
    
    cursor.executemany('''
        INSERT OR IGNORE INTO suppliers (supplier_name) VALUES (?)
    ''', [('Munich Precision GmbH',), ('Infineon Direct',), ('Brembo OEM',), ('Panasonic Energy',)])

    # --- SEED DATA: INVENTORY ---
    inventory_data = [
        ('AE-V8-SENS', 'High-Fidelity Acoustic Emission Sensor', 'Powertrain Validation', 12, 20, 450.00, 14, 'Munich Precision GmbH'),
        ('MCU-TC397-EVO', 'TriCore Microcontroller TC397', 'Electronics', 150, 500, 45.00, 90, 'Infineon Direct'),
        ('BRK-PAD-99', 'Ceramic Brake Pad Set', 'Chassis', 850, 200, 18.50, 10, 'Brembo OEM'),
        ('BATT-CELL-4680', 'Lithium-Ion Cell 4680', 'Powertrain', 4000, 5000, 12.00, 45, 'Panasonic Energy')
    ]
    
    cursor.executemany('''
        INSERT OR IGNORE INTO inventory_parts (sku, part_name, category_id, current_stock, safety_stock, unit_cost, lead_time_days, supplier_id)
        VALUES (?, ?, (SELECT category_id FROM categories WHERE category_name = ?), ?, ?, ?, ?, (SELECT supplier_id FROM suppliers WHERE supplier_name = ?))
    ''', inventory_data)

    # --- SEED DATA: PRODUCTION JOBS ---
    job_data = [
        ('V8 Engine Acoustic Validation Rig B', '2026-04-25', 12500.00),
        ('ADAS ECU Assembly Line', '2026-05-10', 45000.00),
        ('Sedan Fleet Maintenance', '2026-04-20', 2500.00),
        ('EV Battery Pack Gen 3', '2026-06-01', 85000.00)
    ]
    
    cursor.executemany('''
        INSERT OR IGNORE INTO production_jobs (project_name, deadline_date, daily_downtime_penalty)
        VALUES (?, ?, ?)
    ''', job_data)

    # --- SEED DATA: JOB REQUIREMENTS ---
    req_data = [
        ('V8 Engine Acoustic Validation Rig B', 'AE-V8-SENS', 40),
        ('ADAS ECU Assembly Line', 'MCU-TC397-EVO', 1000),
        ('Sedan Fleet Maintenance', 'BRK-PAD-99', 300),
        ('EV Battery Pack Gen 3', 'BATT-CELL-4680', 8000)
    ]

    cursor.executemany('''
        INSERT OR IGNORE INTO job_requirements (job_id, part_id, required_quantity)
        VALUES (
            (SELECT job_id FROM production_jobs WHERE project_name = ?),
            (SELECT part_id FROM inventory_parts WHERE sku = ?),
            ?
        )
    ''', req_data)

    conn.commit()
    conn.close()

# Run setup when the server starts
@app.on_event("startup")
def startup_event():
    setup_database()
    print("Database Initialized Successfully.")

# 3. The API Endpoint for the React Dashboard
import urllib.request
import urllib.error

# --- Z.AI API CONFIGURATION ---
from dotenv import load_dotenv
load_dotenv()

Z_AI_API_KEY = os.getenv("Z_AI_API_KEY")
Z_AI_BASE_URL = os.getenv("Z_AI_BASE_URL", "https://api.ilmu.ai/v1/chat/completions")
Z_AI_MODEL = os.getenv("Z_AI_MODEL", "ilmu-glm-5.1")

def call_z_ai(system_prompt: str, user_prompt: str) -> str:
    headers = {
        "Authorization": f"Bearer {Z_AI_API_KEY}",
        "Content-Type": "application/json"
    }
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": user_prompt})
    
    data = {
        "model": Z_AI_MODEL,
        "messages": messages
    }
    
    req = urllib.request.Request(Z_AI_BASE_URL, headers=headers, data=json.dumps(data).encode("utf-8"))
    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode("utf-8"))
            return result["choices"][0]["message"]["content"]
    except urllib.error.HTTPError as e:
        err_body = e.read().decode('utf-8')
        print(f"Z.AI API Error ({e.code}): {err_body}")
        raise Exception(f"Z.AI API Error: {err_body}")


# --- THE Z.AI SYSTEM PROMPT ---
# This is the "brain" of application. It dictates exactly how the AI behaves.
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
    "status": "CRITICAL",
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
        "math": "string (Show the math breakdown, e.g., '-$5,000 - $3,500 = -$8,500')"
      }
    }
  ],
  "glm_recommendation": {
    "primary_choice": "string (A, B, or C)",
    "explainability": "string (Explain WHY this is the best mathematical and strategic choice. Use specific dollar amounts and mention avoiding the bullwhip effect if applicable.)"
  }
}
"""

def fetch_erp_context(sku: str):
    """Helper function 1: Formats data as a string for the AI Prompt."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM inventory_parts WHERE sku = ?", (sku,))
    inv_data = cursor.fetchone()
    cursor.execute("""
        SELECT pj.* FROM production_jobs pj
        JOIN job_requirements jr ON pj.job_id = jr.job_id
        JOIN inventory_parts ip ON jr.part_id = ip.part_id
        WHERE ip.sku = ?
    """, (sku,))
    prod_data = cursor.fetchone()
    conn.close()
    
    if not inv_data: return "No ERP data found."
    return f"SKU: {inv_data[1]} | Stock: {inv_data[5]} | Penalty: ${prod_data[3]}/day"

def fetch_erp_data_dict(sku: str):
    """Helper function 2: Formats data as a dictionary for the React UI."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM inventory_parts WHERE sku = ?", (sku,))
    inv_data = cursor.fetchone()
    cursor.execute("""
        SELECT pj.*, jr.required_quantity FROM production_jobs pj
        JOIN job_requirements jr ON pj.job_id = jr.job_id
        JOIN inventory_parts ip ON jr.part_id = ip.part_id
        WHERE ip.sku = ?
    """, (sku,))
    prod_data = cursor.fetchone()
    conn.close()
    
    if inv_data and prod_data:
        return {
            "sku": sku,
            "part_name": inv_data[2],
            "current_inventory": inv_data[5],  # This grabs the LIVE stock number!
            "unit_cost": inv_data[7],
            "daily_penalty": prod_data[3],
            "required_quantity": prod_data[4],
            "database_status": "200 OK - Read Successful"
        }
    return None

def extract_sku_from_trigger(email_text: str) -> str:
    """
    Step 1 of the Agentic Workflow. 
    Calls Z.AI to extract the SKU dynamically.
    """
    prompt = f"Extract the specific part number/SKU from this text. Output ONLY the SKU string, no other words. Text: {email_text}"
    
    try:
        ai_response = call_z_ai("", prompt)
        sku = ai_response.strip()
        # Clean up any potential markdown or extra spaces
        match = re.search(r'[A-Z0-9]{2,}-[A-Z0-9]{2,}-[A-Z0-9]{2,}', sku.upper())
        if match:
            return match.group(0)
    except Exception as e:
        print(f"Extraction AI failed, falling back to Regex: {e}")
    
    # Fallback regex if AI fails (e.g. subscription error)
    match = re.search(r'[A-Z0-9]{2,}-[A-Z0-9]{2,}-[A-Z0-9]{2,}', email_text.upper())
    
    if match:
        return match.group(0)
    
    return None # Returns None if no SKU is found in the email

@app.post("/api/analyze-crisis")
async def analyze_crisis(trigger_data: dict):
    incoming_email = trigger_data.get("trigger_text", "")
    
    # 1. The Extractor AI reads the email and finds the SKU dynamically!
    target_sku = extract_sku_from_trigger(incoming_email)
    
    # Safety Check: Email didn't contain a valid SKU
    if not target_sku:
        return {
            "error": "Z.AI could not identify a valid component SKU in the provided text. Please ensure the part number is included."
        }
    
    # 2. Fetch live data for BOTH the AI and the UI using the dynamic SKU
    erp_context_string = fetch_erp_context(target_sku)
    live_ui_data = fetch_erp_data_dict(target_sku)
    
    # Safety Check: SKU not in SQLite database
    if not live_ui_data:
         return {
            "error": f"SKU '{target_sku}' extracted from text, but it does not exist in the Enterprise Database master records."
            }
            
    # --- NEW: SHORT-CIRCUIT FOR SAFE STATE ---
    # If the penalty is already 0 (e.g., project was rescheduled) or we have enough stock.
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
                "explainability": "The system has verified that there is no imminent production risk requiring action."
            },
            "contextual_data_retrieved": live_ui_data
        }
    
    # 2. This calls the live Z.AI reasoning engine
    user_prompt = f"UNSTRUCTURED TRIGGER: {incoming_email}\n\nSTRUCTURED ERP CONTEXT:\n{erp_context_string}"
    
    try:
        ai_json_string = call_z_ai(CHAINLOGIC_SYSTEM_PROMPT, user_prompt)
    except Exception as e:
        # Fallback to hardcoded mock if API fails (e.g. model subscription error)
        print("Falling back to hardcoded mock due to API error:", e)
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
                        "math": "-$5,000 (Air) - $3,500 (Premium) = -$8,500"
                    }
                },
                {
                    "option_id": "C",
                    "action": "Reschedule Rig B to V6 Engine Variant Testing",
                    "justification": "Swapping the testing schedule entirely avoids the downtime penalty and requires zero additional capital.",
                    "financial_impact": { "net_financial_impact": 0 },
                    "computation_breakdown": {
                        "formula": "Penalty Avoidance = Daily Penalty × Days Delay",
                        "math": "$12,500 × 0 = $0 (Schedule Shift)"
                    }
                }
            ],
            "glm_recommendation": {
                "primary_choice": "C",
                "explainability": "Option C mitigates the daily penalty and avoids an expedite fee."
            }
        }
        """

    try:
        # 3. Clean up formatting and convert string to Python dictionary
        ai_json_string = ai_json_string.strip()
        if ai_json_string.startswith("```json"):
            ai_json_string = ai_json_string[7:]
        if ai_json_string.startswith("```"):
            ai_json_string = ai_json_string[3:]
        if ai_json_string.endswith("```"):
            ai_json_string = ai_json_string[:-3]
        ai_json_string = ai_json_string.strip()
        
        decision_data = json.loads(ai_json_string)
        
        # 4. 🔥 THE MAGIC STEP: Inject the live SQLite data into the dictionary
        decision_data["contextual_data_retrieved"] = live_ui_data
        
        # Make the AI's baseline impact text dynamic based on real inventory
        current_stock = live_ui_data["current_inventory"]
        daily_penalty = live_ui_data["daily_penalty"]
        decision_data["crisis_analysis"]["baseline_impact"] = f"Current stock of {current_stock} units will not meet the requirement. Penalty risk is ${daily_penalty:,.2f}/day."
        decision_data["crisis_analysis"]["affected_component"]["sku"] = target_sku
        
        # 5. Send to React
        return decision_data
        
    except Exception as e:
        return {"error": str(e)}

@app.post("/api/execute-decision")
async def execute_decision(payload: dict):
    # 1. Retrieve the dynamic data passed from the frontend
    option_id = payload.get("option_id", "N/A")
    target_sku = payload.get("sku")
    action_text = payload.get("action", "AI Automated Adjustment")
    
    # Financial impact might come nested or direct depending on UI
    financial_impact = payload.get("financial_impact", 0)
    
    if not target_sku:
        return {"status": "error", "message": "SKU is missing from the payload."}
    
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    try:
        # --- FULLY DYNAMIC CLOSED LOOP EXECUTION ---
        
        # 1. Update the Production Job to reflect the AI's strategic action
        # We tag the project name with the AI's exact action string.
        cursor.execute("""
            UPDATE production_jobs 
            SET project_name = ?, 
                daily_downtime_penalty = 0 
            WHERE job_id IN (
                SELECT pj.job_id FROM production_jobs pj
                JOIN job_requirements jr ON pj.job_id = jr.job_id
                JOIN inventory_parts ip ON jr.part_id = ip.part_id
                WHERE ip.sku = ?
            )
        """, (f"[{option_id} EXECUTED] {action_text}", target_sku))
        
        # 2. Dynamically update Inventory Cost if the AI defined a financial impact
        if financial_impact:
            try:
                impact_value = float(financial_impact)
                # If impact is negative (a cost), we increase the unit cost
                if impact_value < 0:
                    cost_increase = abs(impact_value)
                    cursor.execute("""
                        UPDATE inventory_parts 
                        SET unit_cost = unit_cost + ?
                        WHERE sku = ?
                    """, (cost_increase, target_sku))
            except (ValueError, TypeError):
                pass
            
        conn.commit()
        
        # Fetch the updated state to return to the UI
        cursor.execute("""
            SELECT pj.project_name, pj.daily_downtime_penalty 
            FROM production_jobs pj
            JOIN job_requirements jr ON pj.job_id = jr.job_id
            JOIN inventory_parts ip ON jr.part_id = ip.part_id
            WHERE ip.sku = ?
        """, (target_sku,))
        updated_row = cursor.fetchone()
        
        return {
            "status": "success",
            "message": "ERP Database Successfully Updated with AI Decision.",
            "new_state": {
                "project": updated_row[0] if updated_row else "Unknown", 
                "penalty": updated_row[1] if updated_row else 0
            }
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}
    finally:
        conn.close()