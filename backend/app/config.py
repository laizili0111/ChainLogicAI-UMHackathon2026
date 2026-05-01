import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # Z.AI Config
    Z_AI_API_KEY = os.getenv("Z_AI_API_KEY")
    Z_AI_BASE_URL = os.getenv("Z_AI_BASE_URL", "https://api.ilmu.ai/v1/chat/completions")
    Z_AI_MODEL = os.getenv("Z_AI_MODEL", "ilmu-glm-5.1")

    # OpenRouter Fallback Config
    OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
    OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions"
    FALLBACK_MODELS = [
        "nvidia/nemotron-3-super-120b-a12b:free",
        "google/gemma-4-26b-a4b-it:free",
        "openai/gpt-oss-120b:free"
    ]
    
    DB_FILE = 'chainlogic_erp.db'

settings = Settings()
