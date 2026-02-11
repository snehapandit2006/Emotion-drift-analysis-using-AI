from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from db.database import get_db
from db.models import User, EmotionLog, FaceEmotionLog
from api.deps import get_current_user
from analysis.fusion import analyze_fusion

router = APIRouter(prefix="/support-insights", tags=["support"])

TELE_MANAS_INFO = {
    "name": "Tele-MANAS (Mental Health Helpline)",
    "phone": "14416",
    "hours": "24x7",
    "description": "Free, confidential mental health support from the Govt. of India.",
    "is_emergency": False
}

@router.get("/")
def get_support_insights(
    days: int = 14,
    include_nearby: bool = False,
    lat: float = None,
    lon: float = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns emotional severity analysis and support resources.
    Does NOT provide medical diagnosis.
    """
    
    # ... (existing fetching logic)
    cutoff = datetime.utcnow() - timedelta(days=days)
    
    recent_text = (
        db.query(EmotionLog)
        .filter(EmotionLog.user_id == current_user.id, EmotionLog.created_at >= cutoff)
        .all()
    )
    
    recent_face = (
        db.query(FaceEmotionLog)
        .filter(FaceEmotionLog.user_id == current_user.id, FaceEmotionLog.timestamp >= cutoff)
        .all()
    )
    
    # 2. Run Analysis
    fusion_result = analyze_fusion(recent_text, recent_face, range_days=days)
    severity_info = fusion_result.get("severity", {})
    
    nearby_help = []
    if include_nearby:
        if lat and lon:
            try:
                nearby_help = fetch_nearby_places(lat, lon)
            except Exception as e:
                print(f"Error fetching nearby places: {e}")
                # Fallback or empty
                nearby_help = []
        else:
            # Mock Data for demo purposes if no location provided
            nearby_help = [
                {
                    "name": "Dr. Anjali Sharma, PhD",
                    "clinic": "MindWell Clinic",
                    "distance": "2.4 km",
                    "contact": "011-23456789",
                    "map_link": "https://maps.google.com/?q=MindWell+Clinic"
                },
                {
                    "name": "City Mental Health Center",
                    "clinic": "Govt. Hospital Wing A",
                    "distance": "4.1 km",
                    "contact": "011-98765432",
                    "map_link": "https://maps.google.com/?q=City+Mental+Health+Center"
                }
            ]
    
    # 3. Construct Response
    response = {
        "analysis_period_days": days,
        "severity": severity_info,
        "resources": {
            "tele_manas": TELE_MANAS_INFO,
            "nearby_help": nearby_help,
            "guidance_text": [
                "Speaking to a trained professional can help you navigate difficult emotions.",
                "These insights are based on observed patterns, not a medical diagnosis."
            ]
        }
    }
    
    return response

def fetch_nearby_places(lat, lon):
    try:
        # Overpass API
        # Find nodes with amenity=doctors, healthcare=psychotherapist, or amenity=clinic within 5000m
        overpass_url = "https://overpass-api.de/api/interpreter"
        overpass_query = f"""
        [out:json];
        (
          node["healthcare"="psychotherapist"](around:5000, {lat}, {lon});
          node["amenity"="doctors"](around:5000, {lat}, {lon});
          node["amenity"="clinic"](around:5000, {lat}, {lon});
        );
        out body;
        """
        
        response = requests.get(overpass_url, params={'data': overpass_query}, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        places = []
        for element in data.get('elements', []):
            p_lat = element.get("lat")
            p_lon = element.get("lon")
            tags = element.get("tags", {})
            
            name = tags.get("name", "Medical Professional")
            clinic_type = tags.get("healthcare") or tags.get("amenity") or "Clinic"
            
            # Distance Calc
            R = 6371 # km
            d_lat = math.radians(p_lat - lat)
            d_lon = math.radians(p_lon - lon)
            a = (math.sin(d_lat/2) * math.sin(d_lat/2) +
                 math.cos(math.radians(lat)) * math.cos(math.radians(p_lat)) * 
                 math.sin(d_lon/2) * math.sin(d_lon/2))
            c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
            dist = R * c
            
            places.append({
                "name": name,
                "clinic": clinic_type.replace('_', ' ').title(),
                "distance": f"{dist:.1f} km",
                "lat": p_lat,
                "lon": p_lon,
                "contact": tags.get("phone") or "Contact via Web",
                "map_link": f"https://www.openstreetmap.org/node/{element.get('id')}"
            })
            
        # Sort by distance and limit
        places.sort(key=lambda x: float(x["distance"].split()[0]))
        return places[:10]
        
    except Exception as e:
        print(f"Overpass API Error: {e}")
        return []
