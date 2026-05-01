from sqlalchemy import create_engine, Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from sqlalchemy.pool import StaticPool
from .config import settings

engine_kwargs = {}
# SQLite needs specific thread settings. Postgres doesn't.
if "sqlite" in settings.DATABASE_URL:
    engine_kwargs["connect_args"] = {"check_same_thread": False}
    engine_kwargs["poolclass"] = StaticPool

engine = create_engine(settings.DATABASE_URL, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- ORM Models ---

class Supplier(Base):
    __tablename__ = "suppliers"
    supplier_id = Column(Integer, primary_key=True, index=True)
    supplier_name = Column(String, unique=True, nullable=False)

class Category(Base):
    __tablename__ = "categories"
    category_id = Column(Integer, primary_key=True, index=True)
    category_name = Column(String, unique=True, nullable=False)

class InventoryPart(Base):
    __tablename__ = "inventory_parts"
    part_id = Column(Integer, primary_key=True, index=True)
    sku = Column(String, unique=True, nullable=False)
    part_name = Column(String, nullable=False)
    category_id = Column(Integer, ForeignKey("categories.category_id"))
    supplier_id = Column(Integer, ForeignKey("suppliers.supplier_id"))
    current_stock = Column(Integer, default=0)
    safety_stock = Column(Integer, default=0)
    unit_cost = Column(Float)
    lead_time_days = Column(Integer)
    
    category = relationship("Category")
    supplier = relationship("Supplier")
    job_requirements = relationship("JobRequirement", back_populates="part")

class ProductionJob(Base):
    __tablename__ = "production_jobs"
    job_id = Column(Integer, primary_key=True, index=True)
    project_name = Column(String, unique=True, nullable=False)
    deadline_date = Column(String)
    daily_downtime_penalty = Column(Float)
    
    requirements = relationship("JobRequirement", back_populates="job", cascade="all, delete-orphan")

class JobRequirement(Base):
    __tablename__ = "job_requirements"
    job_id = Column(Integer, ForeignKey("production_jobs.job_id", ondelete="CASCADE"), primary_key=True)
    part_id = Column(Integer, ForeignKey("inventory_parts.part_id"), primary_key=True)
    required_quantity = Column(Integer, nullable=False)
    
    job = relationship("ProductionJob", back_populates="requirements")
    part = relationship("InventoryPart", back_populates="job_requirements")

# --- Database Operations ---

def setup_database():
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Skip if already seeded
        if db.query(Category).first():
            return
            
        # Seed Categories
        for c_name in ['Powertrain Validation', 'Electronics', 'Chassis', 'Powertrain']:
            db.add(Category(category_name=c_name))
            
        # Seed Suppliers
        for s_name in ['Munich Precision GmbH', 'Infineon Direct', 'Brembo OEM', 'Panasonic Energy']:
            db.add(Supplier(supplier_name=s_name))
            
        db.commit()

        # Seed Inventory
        inv_data = [
            ('AE-V8-SENS', 'High-Fidelity Acoustic Emission Sensor', 'Powertrain Validation', 12, 20, 450.00, 14, 'Munich Precision GmbH'),
            ('MCU-TC397-EVO', 'TriCore Microcontroller TC397', 'Electronics', 150, 500, 45.00, 90, 'Infineon Direct'),
            ('BRK-PAD-99', 'Ceramic Brake Pad Set', 'Chassis', 850, 200, 18.50, 10, 'Brembo OEM'),
            ('BATT-CELL-4680', 'Lithium-Ion Cell 4680', 'Powertrain', 4000, 5000, 12.00, 45, 'Panasonic Energy')
        ]
        
        for item in inv_data:
            cat = db.query(Category).filter_by(category_name=item[2]).first()
            sup = db.query(Supplier).filter_by(supplier_name=item[7]).first()
            db.add(InventoryPart(
                sku=item[0], part_name=item[1], category_id=cat.category_id,
                current_stock=item[3], safety_stock=item[4], unit_cost=item[5],
                lead_time_days=item[6], supplier_id=sup.supplier_id
            ))
        db.commit()

        # Seed Jobs
        job_data = [
            ('V8 Engine Acoustic Validation Rig B', '2026-04-25', 12500.00),
            ('ADAS ECU Assembly Line', '2026-05-10', 45000.00),
            ('Sedan Fleet Maintenance', '2026-04-20', 2500.00),
            ('EV Battery Pack Gen 3', '2026-06-01', 85000.00)
        ]
        for job in job_data:
            db.add(ProductionJob(project_name=job[0], deadline_date=job[1], daily_downtime_penalty=job[2]))
        db.commit()
        
        # Seed Requirements
        req_data = [
            ('V8 Engine Acoustic Validation Rig B', 'AE-V8-SENS', 40),
            ('ADAS ECU Assembly Line', 'MCU-TC397-EVO', 1000),
            ('Sedan Fleet Maintenance', 'BRK-PAD-99', 300),
            ('EV Battery Pack Gen 3', 'BATT-CELL-4680', 8000)
        ]
        for req in req_data:
            job = db.query(ProductionJob).filter_by(project_name=req[0]).first()
            part = db.query(InventoryPart).filter_by(sku=req[1]).first()
            db.add(JobRequirement(job_id=job.job_id, part_id=part.part_id, required_quantity=req[2]))
            
        db.commit()
    finally:
        db.close()


def fetch_erp_context(sku: str):
    db = SessionLocal()
    try:
        part = db.query(InventoryPart).filter_by(sku=sku).first()
        if not part: return "No ERP data found."
        
        req = db.query(JobRequirement).filter_by(part_id=part.part_id).first()
        penalty = req.job.daily_downtime_penalty if req and req.job else 0.0
        
        return f"SKU: {part.sku} | Stock: {part.current_stock} | Penalty: ${penalty}/day"
    finally:
        db.close()

def fetch_erp_data_dict(sku: str):
    db = SessionLocal()
    try:
        part = db.query(InventoryPart).filter_by(sku=sku).first()
        if not part: return None
        
        req = db.query(JobRequirement).filter_by(part_id=part.part_id).first()
        
        if req and req.job:
            return {
                "sku": sku,
                "part_name": part.part_name,
                "current_inventory": part.current_stock,
                "unit_cost": part.unit_cost,
                "daily_penalty": req.job.daily_downtime_penalty,
                "required_quantity": req.required_quantity,
                "database_status": "200 OK - Read Successful"
            }
        return None
    finally:
        db.close()

def execute_ai_decision(target_sku: str, option_id: str, action_text: str, financial_impact: float):
    db = SessionLocal()
    try:
        part = db.query(InventoryPart).filter_by(sku=target_sku).first()
        if not part: return None
        
        # Find all jobs that require this part
        reqs = db.query(JobRequirement).filter_by(part_id=part.part_id).all()
        
        for req in reqs:
            job = req.job
            job.project_name = f"[{option_id} EXECUTED] {action_text}"
            job.daily_downtime_penalty = 0
            
        if financial_impact:
            try:
                impact_value = float(financial_impact)
                if impact_value < 0:
                    cost_increase = abs(impact_value)
                    part.unit_cost += cost_increase
            except (ValueError, TypeError):
                pass
                
        db.commit()
        
        # Return updated row as tuple for backwards compatibility in the API endpoint
        if reqs:
            return (reqs[0].job.project_name, reqs[0].job.daily_downtime_penalty)
        return None
    finally:
        db.close()
