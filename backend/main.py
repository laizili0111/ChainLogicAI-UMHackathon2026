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
    
    # Create Inventory Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS inventory (
        part_id INTEGER PRIMARY KEY,
        sku TEXT UNIQUE,
        part_name TEXT,
        category TEXT,
        current_stock INTEGER,
        safety_stock INTEGER,
        unit_cost REAL,
        lead_time_days INTEGER,
        primary_supplier TEXT
    )
    ''')

    # Create Production Schedule Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS production_schedule (
        job_id INTEGER PRIMARY KEY,
        project_name TEXT UNIQUE, 
        required_sku TEXT,
        required_quantity INTEGER,
        deadline_date TEXT,
        daily_downtime_penalty REAL,
        FOREIGN KEY (required_sku) REFERENCES inventory (sku)
    )
    ''')

    # --- SEED DATA: INVENTORY ---
    inventory_data = [
        # 1. Our Original Hero Scenario
        ('AE-V8-SENS', 'High-Fidelity Acoustic Emission Sensor', 'Powertrain Validation', 12, 20, 450.00, 14, 'Munich Precision GmbH'),
        # 2. High Stakes, Low Cost part
        ('MCU-TC397-EVO', 'TriCore Microcontroller TC397', 'Electronics', 150, 500, 45.00, 90, 'Infineon Direct'),
        # 3. Overstocked Commodity (No Crisis)
        ('BRK-PAD-99', 'Ceramic Brake Pad Set', 'Chassis', 850, 200, 18.50, 10, 'Brembo OEM'),
        # 4. High Volume EV Component
        ('BATT-CELL-4680', 'Lithium-Ion Cell 4680', 'Powertrain', 4000, 5000, 12.00, 45, 'Panasonic Energy')
    ]
    
    cursor.executemany('''
        INSERT OR IGNORE INTO inventory (sku, part_name, category, current_stock, safety_stock, unit_cost, lead_time_days, primary_supplier)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', inventory_data)

    # --- SEED DATA: PRODUCTION SCHEDULE ---
    schedule_data = [
        ('V8 Engine Acoustic Validation Rig B', 'AE-V8-SENS', 40, '2026-04-25', 12500.00),
        ('ADAS ECU Assembly Line', 'MCU-TC397-EVO', 1000, '2026-05-10', 45000.00),
        ('Sedan Fleet Maintenance', 'BRK-PAD-99', 300, '2026-04-20', 2500.00),
        ('EV Battery Pack Gen 3', 'BATT-CELL-4680', 8000, '2026-06-01', 85000.00)
    ]
    
    cursor.executemany('''
        INSERT OR IGNORE INTO production_schedule (project_name, required_sku, required_quantity, deadline_date, daily_downtime_penalty)
        VALUES (?, ?, ?, ?, ?)
    ''', schedule_data)

    conn.commit()
    conn.close()

# Run setup when the server starts
@app.on_event("startup")
def startup_event():
    setup_database()
    print("Database Initialized Successfully.")

# 3. The API Endpoint for the React Dashboard
# import z_ai_sdk  <-- Import the actual hackathon SDK here

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
      "financial_impact": { "net_financial_impact": number (Use negative numbers for costs) }
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
    cursor.execute("SELECT * FROM inventory WHERE sku = ?", (sku,))
    inv_data = cursor.fetchone()
    cursor.execute("SELECT * FROM production_schedule WHERE required_sku = ?", (sku,))
    prod_data = cursor.fetchone()
    conn.close()
    
    if not inv_data: return "No ERP data found."
    return f"SKU: {inv_data[1]} | Stock: {inv_data[4]} | Penalty: ${prod_data[5]}/day"

def fetch_erp_data_dict(sku: str):
    """Helper function 2: Formats data as a dictionary for the React UI."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM inventory WHERE sku = ?", (sku,))
    inv_data = cursor.fetchone()
    cursor.execute("SELECT * FROM production_schedule WHERE required_sku = ?", (sku,))
    prod_data = cursor.fetchone()
    conn.close()
    
    if inv_data and prod_data:
        return {
            "sku": sku,
            "current_inventory": inv_data[4],  # This grabs the LIVE stock number!
            "unit_cost": inv_data[6],
            "daily_penalty": prod_data[5],
            "database_status": "200 OK - Read Successful"
        }
    return None

def extract_sku_from_trigger(email_text: str) -> str:
    """
    Step 1 of the Agentic Workflow. 
    In production, this is a fast Z.AI prompt. For the hackathon MVP, we simulate the AI's extraction using a Regex pattern matching typical automotive SKUs.
    """
    # ---------------------------------------------------------
    # TODO (When API arrives): 
    # prompt = f"Extract the specific part number/SKU from this text. Output ONLY the SKU string. Text: {email_text}"
    # response = z_ai_client.generate(prompt)
    # return response.text.strip()
    # ---------------------------------------------------------
    
    # -- MOCK AI EXTRACTION --
    # This regex looks for patterns like "AE-V8-SENS" (letters/numbers separated by hyphens)
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
    
    # 2. This is the hardcoded AI response (until getting the API key)
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
                "financial_impact": { "net_financial_impact": -8500 }
            },
            {
                "option_id": "C",
                "action": "Reschedule Rig B to V6 Engine Variant Testing",
                "justification": "Swapping the testing schedule entirely avoids the downtime penalty and requires zero additional capital.",
                "financial_impact": { "net_financial_impact": 0 }
            }
        ],
        "glm_recommendation": {
            "primary_choice": "C",
            "explainability": "Option C mitigates the daily penalty and avoids an expedite fee."
        }
    }
    """
    
    try:
        # 3. Convert string to Python dictionary
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
    option_id = payload.get("option_id")
    target_sku = payload.get("sku", "AE-V8-SENS")
    # Grab the dynamic text generated by the AI
    action_text = payload.get("action", "AI Automated Adjustment")
    
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    try:
        if option_id == "C":
            # Inject the AI's exact text into the database!
            cursor.execute("""
                UPDATE production_schedule 
                SET project_name = ?, 
                    daily_downtime_penalty = 0 
                WHERE required_sku = ?
            """, (f"RESCHEDULED: {action_text}", target_sku))
            
        elif option_id == "A":
            # We can still hardcode the math for safety, but use dynamic logging
            cursor.execute("""
                UPDATE inventory 
                SET unit_cost = unit_cost + 212.50
                WHERE sku = ?
            """, (target_sku,))
            
        conn.commit()
        
        cursor.execute("SELECT project_name, daily_downtime_penalty FROM production_schedule WHERE required_sku = ?", (target_sku,))
        updated_row = cursor.fetchone()
        
        return {
            "status": "success",
            "message": "ERP Database Successfully Updated.",
            "new_state": {"project": updated_row[0], "penalty": updated_row[1]}
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}
    finally:
        conn.close()