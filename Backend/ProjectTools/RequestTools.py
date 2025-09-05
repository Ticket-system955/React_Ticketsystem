#取得前端資料
class RequestTools:
    #解析
    async def GetJson(self,request):
        try:
            data = await request.json()
            return {"status":True,"notify":"前端資料取得成功 !","data":data}
        except Exception as e:
            return {"status":False,"notify":"前端資料取得失敗 ! 失敗原因 : "+str(e)}
