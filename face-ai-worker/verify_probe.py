import base64,json,urllib.request,cv2 
from insightface.app import FaceAnalysis 
from insightface.data import get_image 
app=FaceAnalysis(name='buffalo_l',providers=['CPUExecutionProvider']) 
app.prepare(ctx_id=0,det_size=(640,640)) 
img=get_image('t1') 
face=app.get(img)[0] 
x1,y1,x2,y2=[int(v) for v in face.bbox] 
crop=img[max(0,y1-40):min(img.shape[0],y2+40),max(0,x1-40):min(img.shape[1],x2+40)] 
ok,buf=cv2.imencode('.jpg',crop) 
b64=base64.b64encode(buf.tobytes()).decode() 
body=json.dumps({'image':b64}).encode() 
req=urllib.request.Request('http://127.0.0.1:8000/extract-embedding',data=body,headers={'Content-Type':'application/json'}) 
extracted=json.loads(urllib.request.urlopen(req,timeout=120).read()) 
vbody=json.dumps({'image':b64,'candidates':[{'id':'probe-person','embedding':extracted['embedding']}]}).encode() 
vreq=urllib.request.Request('http://127.0.0.1:8000/verify',data=vbody,headers={'Content-Type':'application/json'}) 
print(urllib.request.urlopen(vreq,timeout=120).read().decode()) 
