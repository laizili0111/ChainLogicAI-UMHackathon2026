import sqlite3
from .config import settings

def setup_database():
    conn = sqlite3.connect(settings.DB_FILE)
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

def fetch_erp_context(sku: str):
    conn = sqlite3.connect(settings.DB_FILE)
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
    conn = sqlite3.connect(settings.DB_FILE)
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
            "current_inventory": inv_data[5],
            "unit_cost": inv_data[7],
            "daily_penalty": prod_data[3],
            "required_quantity": prod_data[4],
            "database_status": "200 OK - Read Successful"
        }
    return None

def execute_ai_decision(target_sku: str, option_id: str, action_text: str, financial_impact: float):
    conn = sqlite3.connect(settings.DB_FILE)
    cursor = conn.cursor()
    
    try:
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
        
        if financial_impact:
            try:
                impact_value = float(financial_impact)
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
        
        cursor.execute("""
            SELECT pj.project_name, pj.daily_downtime_penalty 
            FROM production_jobs pj
            JOIN job_requirements jr ON pj.job_id = jr.job_id
            JOIN inventory_parts ip ON jr.part_id = ip.part_id
            WHERE ip.sku = ?
        """, (target_sku,))
        updated_row = cursor.fetchone()
        return updated_row
    finally:
        conn.close()
