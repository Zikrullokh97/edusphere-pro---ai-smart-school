# EduSphere Face AI Worker
Real InsightFace embedding extraction + verification worker for EduSphere Pro.

Run:
python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt
uvicorn app:app --host 127.0.0.1 --port 8000

The worker must stay private. Browser clients call the EduSphere API, never the worker directly.

The included passive liveness score is a conservative heuristic, NOT a certified anti-spoofing/PAD model. Replace it with a validated PAD model before using Face ID as a high-security access-control mechanism.
