import os
import traceback
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from repo_parser import clone_and_parse_repo
from agent_engine import run_pitch_generation, run_judge_eval
from slide_exporter import create_pitch_pptx

load_dotenv()

app = FastAPI(title="PitchPilot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalyzeRequest(BaseModel):
    github_url: str

class JudgeRequest(BaseModel):
    pitch_context: dict
    question: str
    answer: str

@app.get("/health")
def health():
    return {"status": "ok", "service": "PitchPilot API"}

@app.post("/api/analyze")
def analyze_repo(req: AnalyzeRequest):
    try:
        parsed = clone_and_parse_repo(req.github_url)
        if not parsed.get("success"):
            return JSONResponse(status_code=400, content={"status": "error", "message": parsed.get("error")})

        pitch_data = run_pitch_generation(
            repo_url=req.github_url,
            readme=parsed.get("readme", ""),
            file_tree=parsed.get("file_tree", "")
        )

        return {"status": "success", "id": "session-1", "data": pitch_data}

    except Exception as e:
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(e), "trace": traceback.format_exc()}
        )

@app.post("/api/judge")
def judge_defense(req: JudgeRequest):
    try:
        feedback = run_judge_eval(req.pitch_context, req.question, req.answer)
        return {"status": "success", "data": feedback}
    except Exception as e:
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})

@app.post("/api/export-pptx")
def export_pptx(pitch_data: dict):
    try:
        pptx_stream = create_pitch_pptx(pitch_data)
        project_name = pitch_data.get("project_name", "PitchDeck").replace(" ", "_")
        return StreamingResponse(
            pptx_stream,
            media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
            headers={"Content-Disposition": f"attachment; filename={project_name}_PitchDeck.pptx"}
        )
    except Exception as e:
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5000)