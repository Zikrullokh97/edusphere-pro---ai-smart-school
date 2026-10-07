import base64, io, math, os
from contextlib import asynccontextmanager
from typing import Any
import cv2, numpy as np
from fastapi import FastAPI, HTTPException
from PIL import Image
try:
    from insightface.app import FaceAnalysis
except Exception as exc:
    FaceAnalysis = None
    INSIGHTFACE_IMPORT_ERROR = str(exc)

@asynccontextmanager
async def lifespan(_: FastAPI):
    # Load InsightFace before accepting traffic so the first API call does not
    # time out while ONNX models initialize on CPU.
    _get_face_app()
    yield

app = FastAPI(title="EduSphere Face AI Worker", version="1.0.0", lifespan=lifespan)
MODEL_NAME=os.getenv("FACE_MODEL_NAME","buffalo_l")
MODEL_VERSION=os.getenv("FACE_MODEL_VERSION","insightface-buffalo_l")
MATCH_THRESHOLD=float(os.getenv("FACE_MATCH_THRESHOLD","0.82"))
LIVENESS_THRESHOLD=float(os.getenv("LIVENESS_THRESHOLD","0.90"))
QUALITY_THRESHOLD=float(os.getenv("FACE_QUALITY_THRESHOLD","0.80"))
_face_app: Any=None

def _decode_image(value:str)->np.ndarray:
    if not isinstance(value,str) or len(value)<100: raise HTTPException(400,"image is required")
    raw=value.split(",",1)[1] if value.startswith("data:image/") and "," in value else value
    try: image=Image.open(io.BytesIO(base64.b64decode(raw,validate=True))).convert("RGB")
    except Exception as exc: raise HTTPException(400,f"invalid image: {exc}") from exc
    return cv2.cvtColor(np.asarray(image),cv2.COLOR_RGB2BGR)

def _get_face_app():
    global _face_app
    if _face_app is not None: return _face_app
    if FaceAnalysis is None: raise HTTPException(503,f"InsightFace unavailable: {INSIGHTFACE_IMPORT_ERROR}")
    try:
        _face_app=FaceAnalysis(name=MODEL_NAME,providers=["CPUExecutionProvider"])
        _face_app.prepare(ctx_id=0,det_size=(640,640))
        return _face_app
    except Exception as exc: raise HTTPException(503,f"face model unavailable: {exc}") from exc

def _faces(image): return _get_face_app().get(image)

def _quality(face,image):
    b=face.bbox.astype(float)
    area=max(0.0,min(1.0,((b[2]-b[0])*(b[3]-b[1]))/float(image.shape[0]*image.shape[1])))
    det=float(getattr(face,"det_score",0.0))
    return max(0.0,min(1.0,0.65*det+0.35*min(1.0,area*10.0)))

def _liveness_score(image,face):
    b=face.bbox.astype(int); x1,y1=max(0,b[0]),max(0,b[1]); x2,y2=min(image.shape[1],b[2]),min(image.shape[0],b[3])
    crop=image[y1:y2,x1:x2]
    if crop.size==0: return 0.0
    gray=cv2.cvtColor(crop,cv2.COLOR_BGR2GRAY)
    lap_var=float(cv2.Laplacian(gray,cv2.CV_64F).var())
    texture=max(0.0,min(1.0,math.log1p(lap_var)/math.log1p(500.0)))
    return max(0.0,min(1.0,0.55*float(getattr(face,"det_score",0.0))+0.45*texture))

def _embedding(face):
    emb=np.asarray(face.embedding,dtype=np.float32); norm=float(np.linalg.norm(emb))
    if norm<=1e-8: raise HTTPException(502,"invalid face embedding")
    emb=emb/norm
    if emb.shape[0]!=512: raise HTTPException(502,f"unexpected embedding dimension: {emb.shape[0]}")
    return [float(x) for x in emb]

@app.get("/health")
def health(): return {"status":"ready","model":MODEL_VERSION,"matchThreshold":MATCH_THRESHOLD,"livenessThreshold":LIVENESS_THRESHOLD}

@app.post("/extract-embedding")
def extract_embedding(payload:dict):
    image=_decode_image(payload.get("image")); faces=_faces(image)
    if len(faces)!=1: raise HTTPException(422,"exactly one face must be visible")
    face=faces[0]; quality=_quality(face,image); live=_liveness_score(image,face)
    return {"embedding":_embedding(face),"confidence":float(face.det_score),"qualityScore":quality,"livenessScore":live,"livenessPassed":live>=LIVENESS_THRESHOLD,"faceDetected":True,"modelVersion":MODEL_VERSION}

@app.post("/liveness")
def liveness(payload:dict):
    image=_decode_image(payload.get("image")); faces=_faces(image)
    if len(faces)!=1: raise HTTPException(422,"exactly one face must be visible")
    face=faces[0]; quality=_quality(face,image); live=_liveness_score(image,face)
    return {"livenessScore":live,"qualityScore":quality,"passed":live>=LIVENESS_THRESHOLD and quality>=QUALITY_THRESHOLD,"faceDetected":True,"modelVersion":MODEL_VERSION}

def _cosine(a,b):
    a=a/max(np.linalg.norm(a),1e-8); b=b/max(np.linalg.norm(b),1e-8); return float(np.dot(a,b))

@app.post("/verify")
def verify(payload:dict):
    image=_decode_image(payload.get("image")); faces=_faces(image)
    if len(faces)!=1: raise HTTPException(422,"exactly one face must be visible")
    face=faces[0]; quality=_quality(face,image); live=_liveness_score(image,face); query=np.asarray(_embedding(face),dtype=np.float32)
    matches=[]
    for candidate in payload.get("candidates") or []:
        try:
            cid=str(candidate["id"]); emb=np.asarray(candidate["embedding"],dtype=np.float32)
            if emb.shape[0]!=512: continue
            matches.append({"id":cid,"score":max(0.0,min(1.0,_cosine(query,emb)))})
        except Exception: continue
    matches.sort(key=lambda x:x["score"],reverse=True)
    return {"match":matches[0] if matches else None,"matches":matches[:5],"livenessScore":live,"qualityScore":quality,"faceDetected":True,"modelVersion":MODEL_VERSION}
