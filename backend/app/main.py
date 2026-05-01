from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .db import setup_database
from .api import router as api_router

app = FastAPI(title="ChainLogic AI Backend - Modularized")

# CRITICAL FOR REACT: Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Open for hackathon dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    setup_database()
    print("Database Initialized Successfully.")

# Include the API router
app.include_router(api_router, prefix="/api")
