from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, BackgroundTasks
from typing import List, Dict
import zipfile
import io
import uuid
import asyncio
from collections import Counter
from datetime import datetime

from api.deps import get_current_user
from db.models import User
from ml.inference import predict_emotion, predict_emotions_batch
from ml.advisor import generate_advice

router = APIRouter(prefix="/analyze", tags=["Analysis"])

# In-memory job storage (in production utilize Redis/DB)
# Structure: { job_id: { status: "queued"|"processing"|"completed"|"failed", progress: int, result: dict, error: str } }
jobs = {}

def process_chat_job(job_id: str, file_content: bytes):
    try:
        jobs[job_id]["status"] = "processing"
        jobs[job_id]["progress"] = 5
        
        # 1. Parse Zip
        zip_file = zipfile.ZipFile(io.BytesIO(file_content))
        all_lines = []
        import re
        
        # Iteration through files
        file_list = zip_file.namelist()
        total_files = len(file_list)
        
        for i, filename in enumerate(file_list):
            if filename.endswith(".txt") and not filename.startswith("__MACOSX"):
                with zip_file.open(filename) as f:
                    text_content = f.read().decode("utf-8", errors="ignore")
                    raw_lines = text_content.split('\n')
                    
                    for l in raw_lines:
                        l = l.strip()
                        if not l: continue
                        
                        # WhatsApp Regex: date, time - sender: message
                        match = re.match(r'^.*? - .*?: (.*)$', l)
                        if match:
                            clean_l = match.group(1)
                            if "<Media omitted>" in clean_l: continue
                            all_lines.append(clean_l)
                        else:
                            if "omitted" not in l and len(l) > 1:
                                all_lines.append(l)
            
            # Update progress during parsing (5% to 15%)
            if total_files > 0:
                jobs[job_id]["progress"] = 5 + int((i / total_files) * 10)

        jobs[job_id]["progress"] = 15

        if not all_lines:
             jobs[job_id]["status"] = "failed"
             jobs[job_id]["error"] = "No valid messages parsed from text files"
             return
             
        # Limit lines if needed but keep high limit
        if len(all_lines) > 5000:
            analysis_lines = all_lines[-5000:]
        else:
            analysis_lines = all_lines
            
        jobs[job_id]["progress"] = 20
        
        # 2. Batch Inference
        # Process in chunks to update progress smoothly
        total_lines = len(analysis_lines)
        chunk_size = 100
        results = []
        
        for i in range(0, total_lines, chunk_size):
            chunk = analysis_lines[i:i+chunk_size]
            batch_results = predict_emotions_batch(chunk) # Synchronous batch call, but fast
            results.extend(batch_results)
            
            # Progress from 20% to 90%
            current_processed = i + len(chunk)
            progress_percent = 20 + int((current_processed / total_lines) * 70)
            jobs[job_id]["progress"] = progress_percent
            
            # No await sleep needed in sync threadpool execution unless explicitly yielding
            # await asyncio.sleep(0)  

        jobs[job_id]["progress"] = 90

        # 3. Aggregate Results
        emotions = [r["emotion"] for r in results if r and r.get("emotion") and r["emotion"] != "unknown"]
        if not emotions:
             jobs[job_id]["status"] = "failed"
             jobs[job_id]["error"] = "No emotions detected in text"
             return
             
        counts = Counter(emotions)
        total = len(emotions)
        distribution = {k: v/total for k, v in counts.items()}
        
        dominant_emotion = counts.most_common(1)[0][0]
        
        # Last meaningful message emotion
        last_results = results[-5:]
        last_emotions = [r["emotion"] for r in last_results if r and r.get("emotion")]
        if last_emotions:
            last_message_emotion = Counter(last_emotions).most_common(1)[0][0]
        else:
            last_message_emotion = "neutral"

        # Generate Advice
        advice = generate_advice(dominant_emotion, last_message_emotion)
        
        # Final Result Construction
        final_result = {
            "total_lines_analyzed": len(analysis_lines),
            "dominant_emotion": dominant_emotion,
            "last_message_emotion": last_message_emotion,
            "distribution": distribution,
            "advice": advice,
            "recent_context": [
                {"text": line, "emotion": res["emotion"]} 
                for line, res in zip(analysis_lines[-5:], last_results) if res
            ]
        }
        
        jobs[job_id]["result"] = final_result
        jobs[job_id]["status"] = "completed"
        jobs[job_id]["progress"] = 100

    except Exception as e:
        print(f"Job {job_id} failed: {e}")
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["error"] = str(e)


@router.post("/chat")
async def analyze_chat_upload(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    if not file.filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="Only .zip files are allowed")

    content = await file.read()
    
    job_id = str(uuid.uuid4())
    jobs[job_id] = {
        "status": "queued",
        "progress": 0,
        "submitted_at": datetime.utcnow()
    }
    
    background_tasks.add_task(process_chat_job, job_id, content)
    
    return {"job_id": job_id}


@router.get("/chat/status/{job_id}")
async def get_chat_analysis_status(job_id: str, current_user: User = Depends(get_current_user)):
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    return {
        "job_id": job_id,
        "status": job["status"],
        "progress": job.get("progress", 0),
        "result": job.get("result"),
        "error": job.get("error")
    }
