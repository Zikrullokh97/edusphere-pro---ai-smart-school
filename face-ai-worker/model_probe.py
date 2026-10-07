from insightface.app import FaceAnalysis 
from insightface.data import get_image 
app=FaceAnalysis(name='buffalo_l',providers=['CPUExecutionProvider']) 
app.prepare(ctx_id=0,det_size=(640,640)) 
img=get_image('t1') 
faces=app.get(img) 
print('REAL_INFERENCE',len(faces),[f.embedding.shape[0] for f in faces]) 
