from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field
import json

from db.database import get_db
from db.models import User, CognitiveSnapshot, CBTReflection
from api.deps import get_current_user
from analysis.cognitive_features import run_pattern_analysis

router = APIRouter(
    prefix="/analysis/cognitive",
    tags=["cognitive-model"]
)

class CBTReflectionSchema(BaseModel):
    what_happened: str
    what_thought: str
    what_felt: str
    what_done: str
    what_next: str
    thought_intensity: int = Field(default=5, ge=1, le=10)
    emotion_intensity: int = Field(default=5, ge=1, le=10)
    associated_pattern: Optional[str] = None

def calculate_statistical_drift(user_id: int, current_profile: CognitiveSnapshot, db: Session) -> dict:
    """
    Computes statistical attention drift (z-score and change) relative to baseline of up to past 30 snapshots.
    """
    categories = ["academics", "career", "health", "relationships", "identity", "family"]
    
    # Fetch up to 30 past profiles (excluding the current profile)
    past_profiles = (
        db.query(CognitiveSnapshot)
        .filter(CognitiveSnapshot.user_id == user_id, CognitiveSnapshot.id != current_profile.id)
        .order_by(CognitiveSnapshot.created_at.desc())
        .limit(30)
        .all()
    )
    
    drift_stats = {}
    for cat in categories:
        curr_val = getattr(current_profile, f"attention_{cat}", 0.0)
        
        if not past_profiles:
            # No baseline available, z-score is 0
            drift_stats[cat] = {
                "current": round(curr_val, 3),
                "previous": 0.0,
                "change": 0.0,
                "z_score": 0.0
            }
            continue
            
        # Extract historical values
        hist_vals = [getattr(p, f"attention_{cat}", 0.0) for p in past_profiles]
        prev_val = hist_vals[0] # most recent previous
        change = round(curr_val - prev_val, 3)
        
        # Calculate mean and std of historical values
        n = len(hist_vals)
        mean_val = sum(hist_vals) / n
        
        # Standard deviation
        variance = sum((x - mean_val) ** 2 for x in hist_vals) / n
        std_val = variance ** 0.5
        
        if std_val > 0.01:
            z_score = round((curr_val - mean_val) / std_val, 2)
        else:
            z_score = 0.0
            
        drift_stats[cat] = {
            "current": round(curr_val, 3),
            "previous": round(prev_val, 3),
            "change": change,
            "z_score": z_score
        }
        
    return drift_stats

@router.get("/latest")
def get_latest_cognitive_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves the latest cognitive snapshot for the authenticated user.
    If none exists, it runs an initial calculation.
    """
    profile = (
        db.query(CognitiveSnapshot)
        .filter(CognitiveSnapshot.user_id == current_user.id)
        .order_by(CognitiveSnapshot.created_at.desc())
        .first()
    )
    if not profile:
        profile = run_pattern_analysis(current_user.id, db)
        
    # Calculate statistical attention drift
    attention_drift = calculate_statistical_drift(current_user.id, profile, db)

    # Parse helps/hurts/effectiveness from JSON
    helps_list = []
    hurts_list = []
    effectiveness_dict = {}
    try:
        if profile.helps:
            helps_list = json.loads(profile.helps)
        if profile.hurts:
            hurts_list = json.loads(profile.hurts)
        if profile.recovery_effectiveness:
            effectiveness_dict = json.loads(profile.recovery_effectiveness)
    except Exception:
        pass

    # Parse signal_source_breakdown from JSON if present
    source_breakdown = {}
    try:
        if getattr(profile, "signal_source_breakdown", None):
            source_breakdown = json.loads(profile.signal_source_breakdown)
    except Exception:
        pass

    return {
        "id": profile.id,
        "created_at": profile.created_at,
        "messages_analyzed": getattr(profile, "messages_analyzed", 1),
        "days_covered": getattr(profile, "days_covered", 1),
        "signal_source_breakdown": source_breakdown,
        "traits": {
            "perfectionism": profile.perfectionism,
            "perfectionism_confidence": profile.perfectionism_confidence,
            "avoidance": profile.avoidance_trait,
            "avoidance_confidence": profile.avoidance_confidence,
            "rumination": profile.rumination_tendency,
            "rumination_confidence": profile.rumination_confidence
        },
        "states": {
            "burnout": profile.burnout_state,
            "burnout_confidence": profile.burnout_confidence,
            "motivation": profile.motivation_level,
            "motivation_confidence": profile.motivation_confidence,
            "stress_adaptation": profile.stress_adaptation,
            "stress_adaptation_confidence": profile.stress_adaptation_confidence,
            "cognitive_flexibility": profile.cognitive_flexibility,
            "cognitive_flexibility_confidence": profile.cognitive_flexibility_confidence
        },
        "attention_map": {
            "distribution": {
                "academics": profile.attention_academics,
                "career": profile.attention_career,
                "health": profile.attention_health,
                "relationships": profile.attention_relationships,
                "identity": profile.attention_identity,
                "family": profile.attention_family
            },
            "drift": attention_drift
        },
        "recovery": {
            "stress_trigger": profile.stress_trigger,
            "helps": helps_list,
            "hurts": hurts_list,
            "recovery_effectiveness": effectiveness_dict,
            "recovery_speed": profile.recovery_speed,
            "support_preference": profile.support_preference
        },
        "signals": {
            "negative_repetition": profile.negative_repetition_count,
            "avoidance_phrases": profile.avoidance_phrases_count,
            "catastrophic_phrases": profile.catastrophic_phrases_count,
            "self_critical_phrases": profile.self_critical_phrases_count,
            "social_mentions": profile.social_mentions_count,
            "coping_mentions": profile.coping_mentions_count
        },
        "notes": profile.notes
    }

@router.get("/history")
def get_cognitive_history(
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns historical cognitive snapshots to render longitudinal trend line charts.
    """
    profiles = (
        db.query(CognitiveSnapshot)
        .filter(CognitiveSnapshot.user_id == current_user.id)
        .order_by(CognitiveSnapshot.created_at.asc())
        .limit(limit)
        .all()
    )
    
    history = []
    for p in profiles:
        helps_list = []
        hurts_list = []
        effectiveness_dict = {}
        try:
            if p.helps:
                helps_list = json.loads(p.helps)
            if p.hurts:
                hurts_list = json.loads(p.hurts)
            if p.recovery_effectiveness:
                effectiveness_dict = json.loads(p.recovery_effectiveness)
        except Exception:
            pass
            
        history.append({
            "created_at": p.created_at,
            "traits": {
                "perfectionism": p.perfectionism,
                "perfectionism_confidence": p.perfectionism_confidence,
                "avoidance": p.avoidance_trait,
                "avoidance_confidence": p.avoidance_confidence,
                "rumination": p.rumination_tendency,
                "rumination_confidence": p.rumination_confidence
            },
            "states": {
                "burnout": p.burnout_state,
                "burnout_confidence": p.burnout_confidence,
                "motivation": p.motivation_level,
                "motivation_confidence": p.motivation_confidence,
                "stress_adaptation": p.stress_adaptation,
                "stress_adaptation_confidence": p.stress_adaptation_confidence,
                "cognitive_flexibility": p.cognitive_flexibility,
                "cognitive_flexibility_confidence": p.cognitive_flexibility_confidence
            },
            "attention_map": {
                "academics": p.attention_academics,
                "career": p.attention_career,
                "health": p.attention_health,
                "relationships": p.attention_relationships,
                "identity": p.attention_identity,
                "family": p.attention_family
            },
            "recovery": {
                "stress_trigger": p.stress_trigger,
                "helps": helps_list,
                "hurts": hurts_list,
                "recovery_effectiveness": effectiveness_dict,
                "recovery_speed": p.recovery_speed,
                "support_preference": p.support_preference
            }
        })
    return history

@router.post("/trigger")
def trigger_analysis(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Forces recalculation of the user's cognitive snapshot based on current chat logs.
    """
    profile = run_pattern_analysis(current_user.id, db)
    
    # Calculate statistical attention drift
    attention_drift = calculate_statistical_drift(current_user.id, profile, db)

    helps_list = []
    hurts_list = []
    effectiveness_dict = {}
    try:
        if profile.helps:
            helps_list = json.loads(profile.helps)
        if profile.hurts:
            hurts_list = json.loads(profile.hurts)
        if profile.recovery_effectiveness:
            effectiveness_dict = json.loads(profile.recovery_effectiveness)
    except Exception:
        pass

    # Parse signal_source_breakdown from JSON if present
    source_breakdown = {}
    try:
        if getattr(profile, "signal_source_breakdown", None):
            source_breakdown = json.loads(profile.signal_source_breakdown)
    except Exception:
        pass

    return {
        "status": "success",
        "profile": {
            "id": profile.id,
            "created_at": profile.created_at,
            "messages_analyzed": getattr(profile, "messages_analyzed", 1),
            "days_covered": getattr(profile, "days_covered", 1),
            "signal_source_breakdown": source_breakdown,
            "traits": {
                "perfectionism": profile.perfectionism,
                "perfectionism_confidence": profile.perfectionism_confidence,
                "avoidance": profile.avoidance_trait,
                "avoidance_confidence": profile.avoidance_confidence,
                "rumination": profile.rumination_tendency,
                "rumination_confidence": profile.rumination_confidence
            },
            "states": {
                "burnout": profile.burnout_state,
                "burnout_confidence": profile.burnout_confidence,
                "motivation": profile.motivation_level,
                "motivation_confidence": profile.motivation_confidence,
                "stress_adaptation": profile.stress_adaptation,
                "stress_adaptation_confidence": profile.stress_adaptation_confidence,
                "cognitive_flexibility": profile.cognitive_flexibility,
                "cognitive_flexibility_confidence": profile.cognitive_flexibility_confidence
            },
            "attention_map": {
                "distribution": {
                    "academics": profile.attention_academics,
                    "career": profile.attention_career,
                    "health": profile.attention_health,
                    "relationships": profile.attention_relationships,
                    "identity": profile.attention_identity,
                    "family": profile.attention_family
                },
                "drift": attention_drift
            },
            "recovery": {
                "stress_trigger": profile.stress_trigger,
                "helps": helps_list,
                "hurts": hurts_list,
                "recovery_effectiveness": effectiveness_dict,
                "recovery_speed": profile.recovery_speed,
                "support_preference": profile.support_preference
            },
            "signals": {
                "negative_repetition": profile.negative_repetition_count,
                "avoidance_phrases": profile.avoidance_phrases_count,
                "catastrophic_phrases": profile.catastrophic_phrases_count,
                "self_critical_phrases": profile.self_critical_phrases_count,
                "social_mentions": profile.social_mentions_count,
                "coping_mentions": profile.coping_mentions_count
            },
            "notes": profile.notes
        }
    }

@router.post("/reflection")
def create_cbt_reflection(
    req: CBTReflectionSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Submits a completed CBT reflection worksheet.
    """
    reflection = CBTReflection(
        user_id=current_user.id,
        what_happened=req.what_happened,
        what_thought=req.what_thought,
        what_felt=req.what_felt,
        what_done=req.what_done,
        what_next=req.what_next,
        thought_intensity=req.thought_intensity,
        emotion_intensity=req.emotion_intensity,
        associated_pattern=req.associated_pattern,
        created_at=datetime.utcnow()
    )
    db.add(reflection)
    db.commit()
    db.refresh(reflection)
    return {"status": "success", "reflection_id": reflection.id}

@router.get("/reflection")
def get_cbt_reflections(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves all submitted CBT reflections for the user.
    """
    reflections = (
        db.query(CBTReflection)
        .filter(CBTReflection.user_id == current_user.id)
        .order_by(CBTReflection.created_at.desc())
        .all()
    )
    return [{
        "id": r.id,
        "what_happened": r.what_happened,
        "what_thought": r.what_thought,
        "what_felt": r.what_felt,
        "what_done": r.what_done,
        "what_next": r.what_next,
        "thought_intensity": r.thought_intensity,
        "emotion_intensity": r.emotion_intensity,
        "associated_pattern": r.associated_pattern,
        "created_at": r.created_at
    } for r in reflections]
