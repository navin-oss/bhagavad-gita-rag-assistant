import os
import time
import logging
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI

# Configure logging
logger = logging.getLogger(__name__)

# Global cache to prevent re-initializing and burning free-tier quota on every request
_CACHED_LLM = None

def get_gemini_llm(force_refresh: bool = False):
    """
    Initialize and return a Gemini language model.
    API key is loaded from environment variables.
    Caches the initialized model to preserve quota.
    """
    global _CACHED_LLM
    if _CACHED_LLM is not None and not force_refresh:
        return _CACHED_LLM

    # Load environment variables
    load_dotenv(override=True)
    gemini_api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    alternate_key = os.getenv("ALTERNATE_GEMINI_API_KEY") or os.getenv("ALTERNATE_GOOGLE_API_KEY")
    
    if gemini_api_key:
        gemini_api_key = gemini_api_key.strip().strip('"').strip("'")
    if alternate_key:
        alternate_key = alternate_key.strip().strip('"').strip("'")
    
    if not gemini_api_key:
        error_msg = "GEMINI_API_KEY (or GOOGLE_API_KEY) not found in environment variables or .env file"
        logger.error(error_msg)
        raise ValueError(error_msg)
    
    # Models in order of priority (prioritizing active models with available quota)
    retry_models = [
        "gemini-3.5-flash-lite",   # Low latency & high free quota
        "gemini-2.5-flash-lite",   # Fast fallback
        "gemini-2.5-flash",        # Reliable fallback
        "gemini-3.7-flash",        # Flash 3.7
        "gemini-3.8-flash",        # Flash 3.8
        "gemini-flash-latest"      # Latest alias
    ]
    
    # Try each available key with each model until one works
    for api_key in [gemini_api_key, alternate_key]:
        if not api_key:
            continue
            
        for model in retry_models:
            try:
                logger.info(f"Trying to initialize {model} with API key")
                llm = ChatGoogleGenerativeAI(
                    model=model,
                    temperature=0.2,
                    google_api_key=api_key,
                    max_retries=1
                )
                # Test the model with a simple query to make sure it works
                llm.invoke("Hello")
                logger.info(f"Successfully initialized and cached {model}")
                _CACHED_LLM = llm
                return _CACHED_LLM
            except Exception as e:
                logger.warning(f"Error with {model}: {e}")
                time.sleep(0.5)
    
    # If we get here, all options failed
    logger.error("All Gemini models and API keys failed")
    raise ValueError("Unable to initialize any Gemini model with available API keys. Please verify your Gemini API key in .env.")