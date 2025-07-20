"""
FastAPI server for the Fund Load Adjudication System.
Provides REST API endpoints for file processing and configuration.
"""

import json
import tempfile
import os
import time
from typing import List, Dict, Any
from fastapi import FastAPI, File, UploadFile, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import uvicorn
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from datetime import datetime

from ..core.processor import FundProcessor
from ..core.models import Configuration, Transaction

# Database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./fund_load_data.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Database Models
class ProcessedOutput(Base):
    __tablename__ = "processed_outputs"
    
    id = Column(Integer, primary_key=True, index=True)
    process_id = Column(String, index=True)
    timestamp = Column(Float)
    filename = Column(String)
    transaction_id = Column(String, index=True)
    customer_id = Column(String, index=True)
    accepted = Column(Boolean)
    original_amount = Column(String)
    effective_amount = Column(String)
    rules_evaluated = Column(Text)  # JSON string
    transaction_time = Column(String)

# Create database tables
Base.metadata.create_all(bind=engine)

# Create FastAPI app
app = FastAPI(
    title="Fund Load Adjudication API",
    description="API for processing fund load transactions with velocity limits",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global processor instance (will be initialized with database session)
processor = None

# Database dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class ProcessingResponse(BaseModel):
    """Response model for processing results."""
    success: bool
    message: str
    results: List[Dict[str, Any]]
    statistics: Dict[str, Any]

class ConfigurationRequest(BaseModel):
    """Request model for configuration updates."""
    daily_limit: str
    weekly_limit: str
    daily_load_count: int
    prime_id_daily_limit: str
    prime_id_daily_count: int
    monday_multiplier: int
    min_customer_id_length: int
    min_transaction_id_length: int

@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "message": "Fund Load Adjudication API",
        "version": "1.0.0",
        "author": "Uriel Aharoni",
        "endpoints": {
            "process": "/api/v1/process",
            "config": "/api/v1/config",
            "health": "/health"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "fund-load-adjudicator",
        "version": "1.0.0"
    }

@app.post("/api/v1/process")
async def process_file(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Process uploaded file with fund load transactions.
    
    Args:
        file: JSONL file with transaction data
        
    Returns:
        ZIP file containing output.txt and audit.txt
    """
    try:
        # Initialize processor with database session for persistence
        global processor
        if processor is None:
            processor = FundProcessor(db_session=db)
        # Validate file type
        if not file.filename or not file.filename.endswith(('.txt', '.jsonl', '.json', '.csv')):
            raise HTTPException(
                status_code=400, 
                detail="File must be .txt, .jsonl, .json, or .csv format"
            )
        
        # Read file content
        content = await file.read()
        if not content:
            raise HTTPException(
                status_code=400, 
                detail="File is empty"
            )
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(mode='wb', delete=False, suffix='.txt') as temp_file:
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        try:
            # Process the file
            results = processor.process_file(temp_file_path)
            
            # Create output.txt (JSON format for frontend table)
            output_lines = []
            for result in results:
                output_line = {
                    'id': result.id,
                    'customer_id': result.customer_id,
                    'accepted': result.accepted
                }
                output_lines.append(json.dumps(output_line, separators=(',', ':')))
            
            output_content = "\n".join(output_lines) + "\n"
            
            # Also create a CSV version for compatibility
            csv_lines = []
            for result in results:
                status = "ACCEPTED" if result.accepted else "REJECTED"
                csv_lines.append(f"{result.id},{result.customer_id},{result.original_amount},{status}")
            
            csv_content = "\n".join(csv_lines) + "\n"
            
            # Create audit.txt (JSONL format)
            audit_lines = []
            for result in results:
                audit_entry = {
                    'id': result.id,
                    'customer_id': result.customer_id,
                    'accepted': result.accepted,
                    'original_amount': result.original_amount,
                    'effective_amount': result.effective_amount,
                    'is_monday': result.is_monday,
                    'rules_evaluated': result.rules_evaluated,
                    'error': result.error,
                    'time': result.time  # Include original transaction time
                }
                audit_lines.append(json.dumps(audit_entry))
            
            audit_content = "\n".join(audit_lines)
            
            # Save results to database for dashboard stats
            process_id = f"process_{int(time.time())}"
            # Use local time instead of UTC for processing timestamp
            from datetime import datetime
            timestamp = datetime.now().timestamp()  # Local time timestamp
            
            # Convert results to the format expected by dashboard stats
            for result in results:
                db_output = ProcessedOutput(
                    process_id=process_id,
                    timestamp=timestamp,
                    filename=file.filename,
                    transaction_id=result.id,
                    customer_id=result.customer_id,
                    accepted=result.accepted,
                    original_amount=result.original_amount,
                    effective_amount=result.effective_amount,
                    rules_evaluated=json.dumps(result.rules_evaluated),
                    transaction_time=result.time
                )
                db.add(db_output)
            
            db.commit()
            
            # Create ZIP file
            import zipfile
            import io
            
            zip_buffer = io.BytesIO()
            with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
                zip_file.writestr('output.txt', output_content)
                zip_file.writestr('audit.txt', audit_content)
                zip_file.writestr('output.csv', csv_content)  # Add CSV for compatibility
            
            zip_buffer.seek(0)
            
            # Return ZIP file
            from fastapi.responses import Response
            return Response(
                content=zip_buffer.getvalue(),
                media_type="application/zip",
                headers={"Content-Disposition": "attachment; filename=results.zip"}
            )
            
        finally:
            # Clean up temporary file
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
                
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Processing failed: {str(e)}"
        )

@app.get("/api/v1/config")
async def get_configuration():
    """Get current system configuration."""
    if processor is None:
        # Initialize with default config if processor not initialized
        temp_processor = FundProcessor()
        config = temp_processor.config
    else:
        config = processor.config
    return {
        "daily_limit": str(config.daily_limit),
        "weekly_limit": str(config.weekly_limit),
        "daily_load_count": config.daily_load_count,
        "prime_id_daily_limit": str(config.prime_id_daily_limit),
        "prime_id_daily_count": config.prime_id_daily_count,
        "monday_multiplier": config.monday_multiplier,
        "min_customer_id_length": config.min_customer_id_length,
        "min_transaction_id_length": config.min_transaction_id_length
    }

@app.post("/api/v1/config")
async def update_configuration(config_request: ConfigurationRequest):
    """Update system configuration."""
    try:
        from decimal import Decimal
        
        # Create new configuration
        new_config = Configuration(
            daily_limit=Decimal(config_request.daily_limit),
            weekly_limit=Decimal(config_request.weekly_limit),
            daily_load_count=config_request.daily_load_count,
            prime_id_daily_limit=Decimal(config_request.prime_id_daily_limit),
            prime_id_daily_count=config_request.prime_id_daily_count,
            monday_multiplier=config_request.monday_multiplier,
            min_customer_id_length=config_request.min_customer_id_length,
            min_transaction_id_length=config_request.min_transaction_id_length
        )
        
        # Update processor configuration
        global processor
        processor = FundProcessor(new_config)
        
        return {
            "success": True,
            "message": "Configuration updated successfully",
            "config": {
                "daily_limit": str(new_config.daily_limit),
                "weekly_limit": str(new_config.weekly_limit),
                "daily_load_count": new_config.daily_load_count,
                "prime_id_daily_limit": str(new_config.prime_id_daily_limit),
                "prime_id_daily_count": new_config.prime_id_daily_count,
                "monday_multiplier": new_config.monday_multiplier,
                "min_customer_id_length": new_config.min_customer_id_length,
                "min_transaction_id_length": new_config.min_transaction_id_length
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Configuration update failed: {str(e)}"
        )

@app.get("/api/v1/statistics")
async def get_statistics():
    """Get processing statistics."""
    # Get statistics from database instead of processor
    db = SessionLocal()
    try:
        outputs = db.query(ProcessedOutput).all()
        total_processed = len(outputs)
        accepted = sum(1 for output in outputs if output.accepted)
        rejected = total_processed - accepted
        return {
            "total_processed": total_processed,
            "accepted": accepted,
            "rejected": rejected
        }
    finally:
        db.close()

@app.get("/api/v1/dashboard-stats")
async def get_dashboard_stats(db: Session = Depends(get_db)):
    """Get comprehensive dashboard statistics from database."""
    try:
        # Get all processed outputs from database
        outputs = db.query(ProcessedOutput).all()
        
        if not outputs:
            # Return empty stats if no data
            return {
                "total_processed_loads": 0,
                "acceptance_rate": 0.0,
                "anomaly_rate": 0.0,
                "rule_violations": 0,
                "high_risk_customers": 0,
                "most_triggered_rule": "None",
                "avg_resolution_time": 0.0,
                "customer_distribution": {},
                "recent_activity": [],
                "processing_trends": {
                    "daily_volume": 0,
                    "weekly_volume": 0,
                    "monthly_volume": 0
                }
            }
        
        # Calculate statistics
        total_processed = len(outputs)
        accepted_count = sum(1 for output in outputs if output.accepted)
        rejected_count = total_processed - accepted_count
        acceptance_rate = (accepted_count / total_processed * 100) if total_processed > 0 else 0
        
        # Count rule violations (rejected transactions)
        rule_violations = rejected_count
        
        # Count high-risk customers (customers with multiple rejections)
        customer_rejections = {}
        for output in outputs:
            if not output.accepted:
                customer_rejections[output.customer_id] = customer_rejections.get(output.customer_id, 0) + 1
        
        high_risk_customers = sum(1 for count in customer_rejections.values() if count > 1)
        
        # Find most triggered rule
        rule_counts = {}
        for output in outputs:
            if not output.accepted and output.rules_evaluated:
                try:
                    rules = json.loads(str(output.rules_evaluated))
                    for rule_name, rule_result in rules.items():
                        if isinstance(rule_result, dict) and not rule_result.get('passed', True):
                            rule_counts[rule_name] = rule_counts.get(rule_name, 0) + 1
                except (json.JSONDecodeError, TypeError):
                    pass
        
        most_triggered_rule = max(rule_counts.items(), key=lambda x: x[1])[0] if rule_counts else "None"
        
        # Calculate customer distribution
        customer_distribution = {}
        for output in outputs:
            customer_distribution[output.customer_id] = customer_distribution.get(output.customer_id, 0) + 1
        
        # Calculate average resolution time (placeholder - would need actual timing data)
        avg_resolution_time = 2.5  # Placeholder value
        
        # Get recent activity (last 10 transactions)
        recent_activity = []
        sorted_outputs = sorted(outputs, key=lambda x: x.timestamp, reverse=True)
        for output in sorted_outputs[:10]:
            recent_activity.append({
                "id": output.transaction_id,
                "customer_id": output.customer_id,
                "status": "ACCEPTED" if output.accepted else "REJECTED",
                "amount": output.original_amount,
                "timestamp": output.timestamp
            })
        
        # Calculate processing trends
        current_time = time.time()
        day_ago = current_time - 86400
        week_ago = current_time - 604800
        month_ago = current_time - 2592000
        
        daily_volume = sum(1 for output in outputs if output.timestamp >= day_ago)
        weekly_volume = sum(1 for output in outputs if output.timestamp >= week_ago)
        monthly_volume = sum(1 for output in outputs if output.timestamp >= month_ago)
        
        return {
            "total_processed_loads": total_processed,
            "acceptance_rate": round(acceptance_rate, 2),
            "anomaly_rate": round((rule_violations / total_processed * 100) if total_processed > 0 else 0, 2),
            "rule_violations": rule_violations,
            "high_risk_customers": high_risk_customers,
            "most_triggered_rule": most_triggered_rule,
            "avg_resolution_time": avg_resolution_time,
            "customer_distribution": customer_distribution,
            "recent_activity": recent_activity,
            "processing_trends": {
                "daily_volume": daily_volume,
                "weekly_volume": weekly_volume,
                "monthly_volume": monthly_volume
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get dashboard stats: {str(e)}"
        )

@app.get("/api/v1/outputs")
async def get_outputs(db: Session = Depends(get_db)):
    """Get all processed outputs from database."""
    try:
        outputs = db.query(ProcessedOutput).order_by(ProcessedOutput.timestamp.desc()).all()
        
        # Group by process_id
        grouped_outputs = {}
        for output in outputs:
            if output.process_id not in grouped_outputs:
                # Convert local timestamp to ISO date string for frontend
                from datetime import datetime
                date_str = datetime.fromtimestamp(output.timestamp).isoformat()
                
                grouped_outputs[output.process_id] = {
                    'id': output.process_id,
                    'timestamp': output.timestamp,
                    'date': date_str,  # Local time for frontend
                    'filename': output.filename,
                    'outputs': []
                }
            
            # Safe JSON parsing with error handling
            try:
                rules_evaluated = json.loads(str(output.rules_evaluated)) if output.rules_evaluated else {}
            except (json.JSONDecodeError, TypeError):
                rules_evaluated = {}
            
            grouped_outputs[output.process_id]['outputs'].append({
                'id': output.transaction_id,
                'customer_id': output.customer_id,
                'accepted': output.accepted,
                'audit': {
                    'effective_amount': output.effective_amount,
                    'rules_evaluated': rules_evaluated
                }
            })
        
        # Convert to list and sort by timestamp (newest first)
        result = list(grouped_outputs.values())
        result.sort(key=lambda x: x['timestamp'], reverse=True)
        
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get outputs: {str(e)}"
        )

@app.post("/api/v1/outputs")
async def save_output(event: Dict[str, Any], db: Session = Depends(get_db)):
    """Save output event to database."""
    try:
        # Extract data from the event
        timestamp = time.time()
        process_id = f"process_{int(timestamp)}"
        
        # Save each output to database
        for output in event.get('outputs', []):
            try:
                db_output = ProcessedOutput(
                    process_id=process_id,
                    timestamp=timestamp,
                    filename=event.get('filename', 'manual_upload'),
                    transaction_id=output.get('id'),
                    customer_id=output.get('customer_id'),
                    accepted=output.get('accepted', False),
                    original_amount=output.get('load_amount', ''),
                    effective_amount=output.get('audit', {}).get('effective_amount', ''),
                    rules_evaluated=json.dumps(output.get('audit', {}).get('rules_evaluated', {})),
                    transaction_time=output.get('time')
                )
                db.add(db_output)
            except Exception as e:
                # Log error but continue processing other outputs
                continue
        
        db.commit()
        return {"success": True, "message": "Output saved to database"}
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save output: {str(e)}"
        )

@app.post("/api/v1/config/reset")
async def reset_configuration():
    """Reset configuration to defaults."""
    try:
        global processor
        processor = FundProcessor()
        
        return {
            "success": True,
            "message": "Configuration reset to defaults",
            "config": {
                "daily_limit": str(processor.config.daily_limit),
                "weekly_limit": str(processor.config.weekly_limit),
                "daily_load_count": processor.config.daily_load_count,
                "prime_id_daily_limit": str(processor.config.prime_id_daily_limit),
                "prime_id_daily_count": processor.config.prime_id_daily_count,
                "monday_multiplier": processor.config.monday_multiplier,
                "min_customer_id_length": processor.config.min_customer_id_length,
                "min_transaction_id_length": processor.config.min_transaction_id_length
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Configuration reset failed: {str(e)}"
        )

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000) 