'''
1.使用時機:前端將資料傳進後端時
2.功能:資料解析(.json())
3.說明:若取得成功
       則回傳->{"status":True,"notify":"前端資料取得成功 !",
                "data":data}
        例外處理
          回傳->{"status":False,
                 "notify":"GetJsonError ! message : [{type(e)} | {e}]}
'''
class RequestTools:
    async def GetJson(self,request):
        try:
            data = await request.json()
            return {"status":True,"notify":"前端資料取得成功 !","data":data}
        except Exception as e:
            return {"status":False,"notify":f"RequestTools.GetJsonError ! message : [{type(e)} | {e}]}
