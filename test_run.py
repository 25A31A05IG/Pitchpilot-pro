import os
import shutil
import tempfile
from dotenv import load_dotenv
import git
from groq import Groq

load_dotenv()

print("--- Step 1: Checking Environment Variables ---")
groq_key = os.getenv("GROQ_API_KEY")
print(f"GROQ_API_KEY present: {bool(groq_key)}")
if groq_key:
    print(f"GROQ_API_KEY prefix: {groq_key[:10]}...")
else:
    print("❌ GROQ_API_KEY is missing from .env")
    exit(1)

print("\n--- Step 2: Testing Git Clone ---")
repo_url = "https://github.com/25A31A05IG/Smart-attendance-system"
temp_dir = tempfile.mkdtemp()
try:
    print(f"Cloning {repo_url} to temporary directory...")
    git.Repo.clone_from(repo_url, temp_dir, depth=1)
    print("✅ Git clone successful!")
    files = os.listdir(temp_dir)
    print(f"Found files: {files}")
except Exception as e:
    print(f"❌ Git Clone Failed: {type(e).__name__} -> {e}")
finally:
    shutil.rmtree(temp_dir, ignore_errors=True)

print("\n--- Step 3: Testing Groq LLM API ---")
try:
    client = Groq(api_key=groq_key)
    
    # Fetch models available in your account
    model_list = client.models.list()
    available_ids = [m.id for m in model_list.data]
    
    # Find the best available chat model
    preferred_models = [
        "llama-3.3-70b-versatile",
        "llama-3.3-70b-specdec",
        "llama-3.2-3b-preview",
        "llama-3.2-1b-preview",
        "llama3-70b-8192",
        "llama3-8b-8192",
        "mixtral-8x7b-32768",
        "gemma2-9b-it"
    ]
    
    chosen_model = None
    for model in preferred_models:
        if model in available_ids:
            chosen_model = model
            break
            
    if not chosen_model:
        # Filter out non-text/audio models
        text_models = [m for m in available_ids if not any(k in m.lower() for k in ["whisper", "orpheus", "guard", "audio", "embed"])]
        chosen_model = text_models[0] if text_models else "llama3-8b-8192"

    print(f"Testing with active model: '{chosen_model}'")

    response = client.chat.completions.create(
        model=chosen_model,
        messages=[{"role": "user", "content": "Respond with the word 'OK' only."}],
        max_tokens=10
    )
    print(f"✅ Groq API Call successful! Response: {response.choices[0].message.content.strip()}")
except Exception as e:
    print(f"❌ Groq API Call Failed: {type(e).__name__} -> {e}")