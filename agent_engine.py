import os
import json
import re
import random
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def get_working_model():
    """Finds an active, non-reasoning Groq chat model."""
    try:
        models = client.models.list()
        all_ids = [m.id for m in models.data]
        
        # Priority list of reliable text models
        priority = [
            "llama-3.3-70b-versatile",
            "llama-3.3-70b-specdec",
            "llama-3.1-8b-instant",
            "llama3-70b-8192",
            "llama3-8b-8192",
            "mixtral-8x7b-32768",
            "gemma2-9b-it",
            "qwen-2.5-32b"
        ]
        
        for p in priority:
            if p in all_ids:
                return p
        
        # Filter out audio, whisper, guard, vision, and reasoning models
        valid_chat_models = [
            m for m in all_ids 
            if not any(k in m.lower() for k in ["whisper", "orpheus", "guard", "vision", "audio", "embed", "tts", "stt", "deepseek", "r1"])
        ]
        
        if valid_chat_models:
            return valid_chat_models[0]
            
        return "llama-3.3-70b-versatile"
    except Exception:
        return "llama-3.3-70b-versatile"

MODEL_ID = get_working_model()

QUESTION_PERSONAS = [
    "Skeptical Technical VC grilling the machine learning accuracy, edge failure cases, latency, and hardware constraints",
    "Go-To-Market / Sales Partner focusing on enterprise sales cycles, pricing tiers, CAC, and distribution channels",
    "Risk & Legal Partner probing biometric privacy compliance (GDPR/FERPA/BIPA), data security, and spoofing liabilities",
    "Product-Led Growth Angel challenging user onboarding friction, UX workflow, and student/employee adoption resistance",
    "Early-Stage Seed Generalist asking about team execution velocity, unit economics, and displacement of legacy incumbents"
]

def clean_json_response(raw_text: str) -> dict:
    """Robust parser that extracts JSON even if surrounded by thoughts or markdown fences."""
    try:
        # Strip <think>...</think> reasoning blocks if present
        cleaned = re.sub(r"<think>.*?</think>", "", raw_text, flags=re.DOTALL).strip()
        # Strip markdown fences
        cleaned = re.sub(r"^```json\s*", "", cleaned, flags=re.MULTILINE)
        cleaned = re.sub(r"^```\s*$", "", cleaned, flags=re.MULTILINE)
        cleaned = cleaned.strip()

        # Direct JSON load attempt
        try:
            return json.loads(cleaned)
        except Exception:
            pass

        # Regex greedy match for outer JSON object
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if match:
            return json.loads(match.group(0))

        raise ValueError("Could not find a valid JSON block in model response.")
    except Exception as e:
        print(f"[Parser Error] Raw response was: {raw_text}")
        raise ValueError(f"Failed to parse LLM output as JSON: {e}")

def run_pitch_generation(repo_url: str, readme: str, file_tree: str) -> dict:
    prompt = f"""Analyze the repository details below and create a 5-slide startup pitch deck.

Repo: {repo_url}

File Structure:
{file_tree}

README:
{readme}

You MUST return ONLY a valid JSON object matching this exact schema. Do not write any explanations before or after the JSON.

{{
  "project_name": "Project Name",
  "tagline": "A punchy, investor-grade one-liner",
  "problem_statement": "Core user problem in 1-2 sentences",
  "solution_overview": "How this tech solves it in 1-2 sentences",
  "target_market": "Target customer persona and market",
  "competitive_moat": "Technical uniqueness or architecture advantage",
  "initial_judge_question": "A sharp, specific question challenging this technology or business model",
  "slides": [
    {{"slide_number": 1, "title": "Problem & Vision", "bullets": ["Key pain point", "Why current tools fail", "Market urgency"]}},
    {{"slide_number": 2, "title": "The Solution", "bullets": ["Core workflow", "Product capability", "Key differentiator"]}},
    {{"slide_number": 3, "title": "Architecture & Stack", "bullets": ["Core language and framework", "Data and model layer", "Deployment architecture"]}},
    {{"slide_number": 4, "title": "Market & Business Model", "bullets": ["Target customer profile", "Pricing and monetization", "Go-to-market strategy"]}},
    {{"slide_number": 5, "title": "Moat & Why Now", "bullets": ["Technical defensibility", "Switching barrier", "Timing catalyst"]}}
  ]
}}
"""
    completion = client.chat.completions.create(
        model=MODEL_ID,
        messages=[
            {"role": "system", "content": "You are PitchPilot, an elite startup accelerator agent that outputs only valid raw JSON."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.2,
        max_tokens=2048,
    )
    return clean_json_response(completion.choices[0].message.content)

def generate_dynamic_judge_question(pitch_context: dict) -> str:
    persona = random.choice(QUESTION_PERSONAS)
    prompt = f"""You are a Silicon Valley Venture Capitalist with the following persona: {persona}.

Analyze this project:
- Name: {pitch_context.get('project_name', 'This Project')}
- Tagline: {pitch_context.get('tagline', '')}
- Problem: {pitch_context.get('problem_statement', '')}
- Solution: {pitch_context.get('solution_overview', '')}
- Target Market: {pitch_context.get('target_market', '')}
- Moat: {pitch_context.get('competitive_moat', '')}

Generate ONE challenging, original question specifically tailored to your investor persona and this specific technology. Do not use generic templates. Output ONLY the question text directly without quotes or intro.
"""
    completion = client.chat.completions.create(
        model=MODEL_ID,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
        max_tokens=120,
    )
    return completion.choices[0].message.content.strip().replace('"', '')

def run_judge_eval(pitch_context: dict, question: str, answer: str) -> dict:
    persona = random.choice(QUESTION_PERSONAS)
    prompt = f"""You are a Silicon Valley VC partner ({persona}) evaluating a startup pitch defense.

Project Context:
- Name: {pitch_context.get('project_name')}
- Moat: {pitch_context.get('competitive_moat')}
- Target Market: {pitch_context.get('target_market')}

Judge Question Asked: {question}
Founder Answer Provided: {answer}

Critique the defense rigorously based on clarity, technical feasibility, and business defensibility.
Generate a follow-up question that directly tests the weak spots in their answer.

Output ONLY a valid JSON object matching this schema:
{{
  "score": 8,
  "verdict": "Strong / Fair / Needs Improvement",
  "feedback": "2-3 sentences of sharp, actionable VC critique.",
  "follow_up_question": "A direct follow-up question continuing from the founder's answer."
}}
"""
    completion = client.chat.completions.create(
        model=MODEL_ID,
        messages=[
            {"role": "system", "content": "You are an expert VC judge returning only raw JSON."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.4,
        max_tokens=1024,
    )
    return clean_json_response(completion.choices[0].message.content)

evaluate_judge_response = run_judge_eval