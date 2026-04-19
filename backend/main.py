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

    # Create Delivery Agreements Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS delivery_schedule (
        job_id INTEGER PRIMARY KEY,
        buyer_name TEXT UNIQUE, 
        required_sku TEXT,
        required_quantity INTEGER,
        deadline_date TEXT,
        spoilage_penalty_rate REAL,
        FOREIGN KEY (required_sku) REFERENCES inventory (sku)
    )
    ''')

    # --- SEED DATA: INVENTORY (COLD CHAIN) ---
    inventory_data = [
        ('POULTRY-WHOLE-A', 'Grade-A Whole Chicken', 'Meat/Poultry', 2000, 500, 12.50, 2, 'Klang Farms Berhad'),
        ('BEEF-WAGYU-A5', 'A5 Wagyu Strip', 'Meat/Beef', 50, 10, 150.00, 7, 'Global Premium Meats'),
        ('MILK-FRESH-1L', 'Fresh Milk 1L', 'Dairy', 1200, 400, 4.50, 1, 'Subang Local Dairy'),
        ('SALMON-FILLET', 'Norwegian Salmon Fillet', 'Seafood', 300, 50, 45.00, 3, 'Nordic Sea Catch')
    ]
    
    cursor.executemany('''
        INSERT OR IGNORE INTO inventory (sku, part_name, category, current_stock, safety_stock, unit_cost, lead_time_days, primary_supplier)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', inventory_data)

    # --- SEED DATA: DELIVERY SCHEDULE & PENALTIES ---
    schedule_data = [
        ('Restaurant FSKTM Campus Cafe', 'POULTRY-WHOLE-A', 200, '2026-04-19 14:00', 2500.00), # Huge contract loss if they fail to supply the university
        ('Elite Steakhouse KL', 'BEEF-WAGYU-A5', 20, '2026-04-25 18:00', 8500.00),
        ('GrocerMart PJ', 'MILK-FRESH-1L', 500, '2026-04-20 06:00', 500.00),
        ('Sushi King Chain', 'SALMON-FILLET', 150, '2026-04-21 11:00', 6750.00)
    ]
    
    cursor.executemany('''
        INSERT OR IGNORE INTO delivery_schedule (buyer_name, required_sku, required_quantity, deadline_date, spoilage_penalty_rate)
        VALUES (?, ?, ?, ?, ?)
    ''', schedule_data)

    conn.commit()
    conn.close()

# Run setup when the server starts
@app.on_event("startup")
def startup_event():
    setup_database()
    print("Database Initialized Successfully. (Cold Chain Logistics)")

# 3. The API Endpoint for the React Dashboard
# import z_ai_sdk  <-- Import the actual hackathon SDK here

# --- THE Z.AI SYSTEM PROMPT ---
# This dictates exactly how the AI behaves. We tell it to care about spoilage now!
CHAINLOGIC_SYSTEM_PROMPT = """
You are ChainLogic AI, an expert Predictive Logistics Engine for Cold-Chain SMEs.
Your primary directive is to analyze logistics disruptions (like broken cooling or traffic), calculate financial trade-offs regarding inventory spoilage, and recommend the best outcome to salvage value.

You will be provided with:
1. UNSTRUCTURED TRIGGER: An email/telegram from a driver regarding the disruption.
2. STRUCTURED ERP CONTEXT: Real-time inventory value and buyer penalty data.

CRITICAL INSTRUCTION: You must respond ONLY with raw, valid JSON. Do not include markdown formatting like ```json. 

Your JSON output must perfectly match this exact schema:
{
  "crisis_analysis": {
    "status": "CRITICAL",
    "affected_component": { "sku": "string", "name": "string" },
    "baseline_impact": "string (Calculate the risk of total inventory loss and financial penalty)"
  },
  "trade_off_options": [
    {
      "option_id": "string (A, B, C)",
      "action": "string",
      "justification": "string (A brief 1-sentence explanation of why this option is viable and its trade-offs)",
      "financial_impact": { "net_financial_impact": number (Use negative numbers for costs/losses) }
    }
  ],
  "glm_recommendation": {
    "primary_choice": "string (A, B, or C)",
    "explainability": "string (Explain WHY this is the best mathematical choice based on reducing spoilage and minimizing margin loss.)"
  }
}
"""

def fetch_erp_data_dict(sku: str):
    """Helper function: Formats data as a dictionary for the React UI."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM inventory WHERE sku = ?", (sku,))
    inv_data = cursor.fetchone()
    cursor.execute("SELECT * FROM delivery_schedule WHERE required_sku = ?", (sku,))
    prod_data = cursor.fetchone()
    conn.close()
    
    if inv_data and prod_data:
        return {
            "sku": sku,
            "current_inventory": inv_data[4],
            "unit_cost": inv_data[6],
            "daily_penalty": prod_data[5], # We use 'daily_penalty' key so the frontend UI doesn't break
            "buyer": prod_data[1],
            "database_status": "200 OK - Read Successful"
        }
    return None

def extract_sku_from_trigger(email_text: str) -> str:
    """
    Step 1 of the Agentic Workflow. 
    A hackathon mock that mimics standard SKU formats in our DB.
    """
    # Looks for words like POULTRY-WHOLE-A, BEEF-WAGYU-A5
    match = re.search(r'[A-Z]+-[A-Z]+-[A-Z0-9]+', email_text.upper())
    
    if match:
        return match.group(0)
    return None

@app.post("/api/analyze-crisis")
async def analyze_crisis(trigger_data: dict):
    incoming_email = trigger_data.get("trigger_text", "")
    
    target_sku = extract_sku_from_trigger(incoming_email)
    
    if not target_sku:
        return {"error": "Z.AI could not identify a valid product SKU."}
    
    live_ui_data = fetch_erp_data_dict(target_sku)
    
    if not live_ui_data:
         return {"error": f"SKU '{target_sku}' does not exist in the Enterprise Database."}
    
    # 2. This is the hardcoded AI response for the Cold-Chain scenario
    ai_json_string = """
    {
        "crisis_analysis": {
            "status": "CRITICAL (TIME-SENSITIVE)",
            "affected_component": { "sku": "POULTRY-WHOLE-A", "name": "Grade-A Whole Chicken" },
            "baseline_impact": "Will be dynamically updated below."
        },
        "trade_off_options": [
            {
                "option_id": "A",
                "action": "Wait Out Traffic (Federal Hwy)",
                "justification": "Doing nothing. Due to broken AC, 85% probability of total inventory spoilage after 2 hours.",
                "financial_impact": { "net_financial_impact": -5000 }
            },
            {
                "option_id": "B",
                "action": "Dispatch Emergency Chiller Truck",
                "justification": "Saves the cargo and fulfills FSKTM Cafe order, but the emergency dispatch consumes all profit margins for this route.",
                "financial_impact": { "net_financial_impact": -1200 }
            },
            {
                "option_id": "C",
                "action": "Reroute & Flash-Sale to Subang Grocer",
                "justification": "Bypasses traffic. Sells inventory at 30% discount to nearby grocer before it spoils. We lose the FSKTM contract daily penalty, but salvage 70% of inventory value.",
                "financial_impact": { "net_financial_impact": -750 }
            }
        ],
        "glm_recommendation": {
            "primary_choice": "C",
            "explainability": "Option C mathematically minimizes total unrecoverable loss. Salvaging 70% of inventory value immediately outweighs the risk of 100% loss and the heavy dispatch fee of Option B."
        }
    }
    """
    
    try:
        decision_data = json.loads(ai_json_string)
        
        # Inject live SQLite data
        decision_data["contextual_data_retrieved"] = live_ui_data
        
        inv = live_ui_data["current_inventory"]
        cost = live_ui_data["unit_cost"]
        penalty = live_ui_data["daily_penalty"]
        buyer = live_ui_data["buyer"]
        
        # Dynamic Risk Sentence!
        decision_data["crisis_analysis"]["baseline_impact"] = f"Broken Cooling Unit detected. {inv} units at high risk. Spoilage cost is ${inv*cost:,.2f}. Failing {buyer} contract incurs additional ${penalty:,.2f} penalty."
        decision_data["crisis_analysis"]["affected_component"]["sku"] = target_sku
        
        return decision_data
        
    except Exception as e:
        return {"error": str(e)}

@app.post("/api/execute-decision")
async def execute_decision(payload: dict):
    option_id = payload.get("option_id")
    target_sku = payload.get("sku", "POULTRY-WHOLE-A")
    action_text = payload.get("action", "AI Automated Reroute")
    
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    try:
        if option_id == "C":
             # Update buyer to Subang Grocer
            cursor.execute("""
                UPDATE delivery_schedule 
                SET buyer_name = ?, 
                    spoilage_penalty_rate = 0 
                WHERE required_sku = ?
            """, (f"FLASH-SALE: Subang Grocer (Rerouted)", target_sku))
            
        elif option_id == "B":
             # Decrease profit margin by increasing cost theoretically
            cursor.execute("""
                UPDATE inventory 
                SET unit_cost = unit_cost + 5.00
                WHERE sku = ?
            """, (target_sku,))
        
        conn.commit()
        cursor.execute("SELECT buyer_name, spoilage_penalty_rate FROM delivery_schedule WHERE required_sku = ?", (target_sku,))
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