import base64,json,urllib.request,cv2 
from insightface.data import get_image 
img=get_image('Tom_Hanks_54745') 
ok,buf=cv2.imencode('.jpg',img) 
b64=base64.b64encode(buf.tobytes()).decode() 
body=json.dumps({'image':b64}).encode() 
req=urllib.request.Request('http://127.0.0.1:8000/extract-embedding',data=body,headers={'Content-Type':'application/json'}) 
print(urllib.request.urlopen(req,timeout=120).read().decode()) 
