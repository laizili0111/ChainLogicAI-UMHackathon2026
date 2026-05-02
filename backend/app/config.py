import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # Ilmu GLM Config (Primary)
    ILMU_API_KEY = os.getenv("ILMU_API_KEY")
    ILMU_BASE_URL = os.getenv("ILMU_BASE_URL", "https://api.ilmu.ai/v1/chat/completions")
    ILMU_MODEL = os.getenv("ILMU_MODEL", "ilmu-glm-5.1")

    # Groq Config (Secondary)
    GROQ_API_KEY = os.getenv("GROQ_API_KEY")
    GROQ_BASE_URL = os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1/chat/completions")
    GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")

    # OpenRouter Fallback Config
    OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
    OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions"
    FALLBACK_MODELS = [
        "nvidia/nemotron-3-super-120b-a12b:free",
        "google/gemma-4-26b-a4b-it:free",
        "openai/gpt-oss-120b:free"
    ]
    # Database Connection
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./chainlogic_erp.db")
    DB_FILE = 'chainlogic_erp.db'

settings = Settings()
