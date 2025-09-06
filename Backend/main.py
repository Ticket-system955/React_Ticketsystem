from fastapi import FastAPI,Request
from starlette.middleware.sessions import SessionMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from .ProjectTools.SqlTools import SqlTools
from .ProjectTools.RequestTools import RequestTools
from .ProjectTools.TotpTools import TotpTools
from .ProjectTools.RedisTools import RedisTools

from .Modules import RegisterModule,LoginModule,IndexModule,LogoutModule,ProfileModule,TicketModule

import os
from dotenv import load_dotenv
load_dotenv()

app = FastAPI()
url = {"mysql":os.getenv("MYSQLPUBLICURL"),
       "redis":os.getenv("REDISPUBLICURL")}
reqT = RequestTools()
totpT = TotpTools()
sqlT = SqlTools(URL=url["mysql"])
redisT = RedisTools(URL=url["redis"])

KEY = "ticket_key"
app.add_middleware(SessionMiddleware,secret_key=KEY)

#@app.post("/auth/verify/init")
'''
1.使用時機:註冊資料填寫完畢並按下確認後

2.功能:回傳Totp的QRcode資料

3.說明:若成功
         則回傳src -> return {"status":True,"totpsrc":src}
         
       例外處理
         回傳錯誤訊息->return {"status":False,
                              "notify":f"ShowQRcodeError !"}'''
@app.post("/auth/verify/init")
async def ShowQRcode(request: Request):
    response = await RegisterModule.ShowQRcode(request=request,reqT=reqT,totpT=totpT)
    return JSONResponse(response)
       
#@app.post("/auth/verify/confirm")
'''
1.使用時機:輸入totp驗證碼後

2.功能:確認驗證碼是否成功，及送出註冊資料

3.說明:若驗證碼輸入正確，且驗證成功
         若資料寫入錯誤
           則回傳錯誤訊息->return {"status":False,
                                  "notify":f"InsertRegisterDataError ! data : [{data}]"}
         否則寫入成功，並回傳->return {"status":True,
                                     "notify":"註冊成功 !",
                                     "secret":secret}
       否則
         回傳錯誤訊息->return {"status":False,
                              "notify":"註冊失敗 !"}
                              
       例外處理
         回傳錯誤訊息->return {"status":False,
                              "notify":f"CheckANDRegisterError !"}'''
@app.post("/auth/verify/confirm")
async def Register(request: Request):
    response = await RegisterModule.CheckANDRegister(request=request,reqT=reqT,sqlT=sqlT,totpT=totpT)
    return JSONResponse(response)

'''
1.使用時機:輸入totp驗證碼時

2.功能:確認驗證碼是否成功，及送出註冊資料

3.說明:若驗證碼輸入正確，且驗證成功
         若資料寫入錯誤
           則回傳錯誤訊息->return {"status":False,
                                  "notify":f"InsertRegisterDataError ! data : [{data}]"}
         否則寫入成功，並回傳->return {"status":True,
                                     "notify":"註冊成功 !",
                                     "secret":secret}
       否則
         回傳錯誤訊息->return {"status":False,
                              "notify":"註冊失敗 !"}
                              
       例外處理
         回傳錯誤訊息->return {"status":False,
                              "notify":f"CheckANDRegisterError !"}'''
@app.post("/auth/login")
async def Login(request:Request):
    response = await LoginModule.Check(request=request,reqT=reqT,sqlT=sqlT)
    return JSONResponse(response)

'''
'''
@app.get("/check_login")
#@app.get("/auth/login/check")
async def check_login(request: Request):
    if "UserID" in request.session:
        return JSONResponse({
            "logged_in": True,
            "UserID": request.session["UserID"],
            "UserName": request.session["UserName"],
            "RegisterID": request.session["RegisterID"]
        })
    else:
        return JSONResponse({
            "logged_in": False
        })

'''
1.使用時機:點選登出選項時

2.功能:確認驗證碼是否成功，及送出註冊資料

3.說明:若驗證碼輸入正確，且驗證成功
         若資料寫入錯誤
           則回傳錯誤訊息->return {"status":False,
                                  "notify":f"InsertRegisterDataError ! data : [{data}]"}
         否則寫入成功，並回傳->return {"status":True,
                                     "notify":"註冊成功 !",
                                     "secret":secret}
       否則
         回傳錯誤訊息->return {"status":False,
                              "notify":"註冊失敗 !"}
                              
       例外處理
         回傳錯誤訊息->return {"status":False,
                              "notify":f"CheckANDRegisterError !"}'''
@app.get("/auth/logout")
async def Logout(request:Request):
    response = await LogoutModule.Logout(request=request)
    return JSONResponse(response)

@app.get("/profile")
async def get_user_profile(request: Request):
    # 沒有登入 → 回 401
    if "UserID" not in request.session:
        return JSONResponse(
            {"status": False, "notify": "未登入"},
            status_code=401
        )
    response = ProfileModule.GetProfileData(request=request,sqlT=sqlT)
    return JSONResponse(response)

           # "status": True,
           # "user": {"login_id": request.session["UserID"],"name": request.session["UserName"],response = ProfileModule.GetProfileData(request=request,sqlT=sqlT)},

    
    '''
@app.post("/profile")
async def Profile(request:Request):
    response = ProfileModule.GetProfileData(request=request,sqlT=sqlT)
    return JSONResponse(response)
 #   response = ProfileModule.GetProfileData(request=request,sqlT=sqlT)
  #  return JSONResponse(response)
       '''
@app.get("/auth/user")
async def User(request : Request):
    response = IndexModule.CheckUserLogin(request=request)
    return JSONResponse(response)

#@app.post("/ticket/lock")
'''
1.使用時機:進行購票時，進行鎖票

2.功能:防止多人同時存取一張票

3.說明:若使用者在任何活動中，存在購票程序，且進行中，卻使用 "非釋放票券(取消購買或放棄)" 的功能，離開購票視窗，去選其他位置時
          則阻止使用者 "購買" -> return {"status":False,
                                        "notify":"不可多選 !"}
          
      若不同使用者，選擇購票程序進行中的位置時
          則阻止使用者 "選取" -> return {"status":False,
                                        "notify":"此位置已經被選取，請稍後再試 !"}
          
      若相同使用者，選擇購票程序進行中的位置時
          則開啟購票視窗 -> return {"status":True,
                                   "time":"購票程序有效的剩餘時間(秒)"}
          
      若使用者，選擇沒有被人選到的位置時
          則開啟購票視窗 -> return {"status":True,
                                   "time":"購票程序有效的剩餘時間(秒)"}

4.參數傳遞:event_id, area, row, column

5.補充說明:*前端接收到回傳的剩餘時間後，要進行倒數的功能
'''
@app.post("/ticket/lock")
async def LockTicket(request:Request):
    response = await TicketModule.Lock(request=request,reqT=reqT,redisT=redisT)
    return JSONResponse(response)
'''
1.使用時機:購票時
2.功能:將票券資料寫入資料庫
'''
@app.post("/ticket")
async def GetTicket(request : Request):
    response = await TicketModule.GetTicketData(request=request,reqT=reqT,sqlT=sqlT,totpT=totpT,redisT=redisT)
    return JSONResponse(response)

#@app.post("/ticket/check")
'''
1.使用時機:使用者點選位置按鈕時(目前本機的作法)
    
2.功能:使用者若已經在一個活動中有購票紀錄了，下次在同一個活動中，就不可以再次購票，實現 "一人一票" 的目標
    
3.說明:若使用者在此活動中，已經存在購票紀錄
          則阻止使用者購票 -> {"status":False,
                              "notify":f"[使用者](username)您好，每人限購一張，不可重複購票 !"}
      若使用者在此活動中，沒有購票紀錄
          則不會有反應(可購票) -> return {"status":True}
    
4.參數傳遞:event_id
    
5.補充說明:
'''
@app.post("/ticket/check")
async def CheckTicket(request : Request):
    response = await TicketModule.CheckTicket(request=request,reqT=reqT,redisT=redisT)
    return JSONResponse(response)

#@app.post("/ticket/cancel")
'''
1.使用時機:放棄選擇的位置時

2.功能:當使用者放棄購買此票時，點選相關的功能按鈕後，使用此API將此票的鎖票程序關閉，即 "釋放票券供其他使用者可選此位"

3.說明:若使用者欲放棄購買此票時
          則關閉購票程序 -> return {"status":True,
                                   "notify":f"鎖票的鍵 & 反查詢的鍵 已從 Redis 中刪除 !"}
          
      另外情況是防呆功能，只會牽扯後端操作，在此就不另外說明
      
4.參數傳遞:event_id, area, row, column

5.補充說明:*本機端的做法是 設置右上角的 "x" 按鈕，以及設立 "購買" "放棄" 按鈕，只有點選 "x" "放棄" 時，才會釋放
'''
@app.post("/ticket/cancel")
async def CancelTicket(request : Request):
    response = await TicketModule.CancelTicket(request=request,reqT=reqT,redisT=redisT)
    return response

#@app.post("/ticket/restore"):
'''
1.使用時機:進入選位畫面時

2.功能:當使用者選位後，進行"上一頁"等可以強制離開購票視窗的功能時
      使用此API，可以讓使用者進入上次選位的活動時，自動將該位置的購票視窗開啟
      
3.說明:若使用者在任何活動中，存在購票程序，且進行中，卻使用 "非釋放票券(取消購買或放棄)" 的功能，離開購票視窗時
          則當使用者重新回到該活動時，會自動開啟該位置的購票視窗 
          -> return {"status":True,
                     "seat":[event_id,area,row,column],
                     "time":"購票程序有效的剩餘時間(秒)"}
          
      若非同一個使用者，即使進入該活動時(假設多人登入的情況)
          則不會有反應 -> return {"status":False,
                                 "notify":"不同的使用者 !"}
          
      若該活動沒有任何進行中的購票程序
          則不會有反應 ->return {"status":False,
                                "notify":"沒有選位資料 !"}
          
4.參數傳遞:前端無須傳遞任何參數

5.補充說明:*前端接收到回傳的剩餘時間後，要進行倒數的功能
          *前端接收到回傳的座位資料後，要進行自動點選的功能
'''
@app.post("/ticket/restore")
async def RestoreTicket(request : Request):
    response = await TicketModule.RestoreTicket(request=request,redisT=redisT)
    return response

@app.post("/ticket/availability")
async def GetTicketAvailability(request : Request):
    response = await TicketModule.CheckTicketPurchased(request=request,reqT=reqT,sqlT=sqlT)
    return JSONResponse(response)

app.mount("/", StaticFiles(directory="Backend/dist", html=True))

'''
改善建議:
    1.進入選位畫面後，等待資料回傳成功，才可進行選擇位置的動作(目前是反白)，也包括自動顯示購票視窗
    2.不論使用者有沒有購票程序進行中，希望是可以點選按鈕也可按下確定，但是不可以選擇購買
    3.購買完成後，驗證碼可以一直送，那就會一直重複購買，這部分會有超賣問題，個人想法是 點選後 -> 關掉點選功能 或 alert
'''
