from fastapi import FastAPI,Path,Query,Form,Request
from starlette.middleware.sessions import SessionMiddleware
from typing import Annotated
from fastapi.responses import JSONResponse,PlainTextResponse,HTMLResponse,FileResponse,RedirectResponse 
from fastapi.staticfiles import StaticFiles
import pymysql
import requests
from bs4 import BeautifulSoup as bs
from bs4 import NavigableString
import os
from dotenv import load_dotenv

app = FastAPI()
load_dotenv()
USER = os.getenv("MYSQLUSER")
PASSWORD = os.getenv("MYSQLPASSWORD")
HOST = os.getenv("MYSQLHOST")
PORT = int(os.getenv("MYSQLPORT"))
DATABASE = os.getenv("MYSQLDATABASE")
KEY = "ticket_key"

app.add_middleware(SessionMiddleware,secret_key=KEY)

def convert_TupleToList(data):
    return list(map(lambda _:list(_),data))

def SQL(db, instruction, SELECT=False, SET=None):
    con = pymysql.connect(
        user=USER,
        password=PASSWORD,
        host=HOST,
        port = PORT,
        database=DATABASE
    )
    cur = con.cursor()
    if SELECT:
        cur.execute(instruction, SET)
        result = cur.fetchall()
        con.close()
        return result
    else:
        if SET:
            cur.execute(instruction, SET)
        else:
            cur.execute(instruction)
        con.commit()
        con.close()
        
def session_check(username):
    if username:
        return JSONResponse({"login_status": True, "username": username,"message": "您好，"+username})
    else:
        return JSONResponse({"login_status": False, "message":"尚未登入"})

@app.post("/account_created")
async def account_created(
    username: str = Form(),
    id_number: str = Form(),
    password: str = Form(),
    real_name: str = Form(),
    gender: str = Form(),
    birthday: str = Form(),
    email: str = Form(),
    phone_number: str = Form(),
    mobile: str = Form(),
    address: str = Form()
):
    SQL(
        db="project",
        instruction="""INSERT INTO register(username,id_number,password,real_name,gender,
                                            birthday,email,phone_number,mobile,address)
                       VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
        SET=(
                id_number,
                password,
                real_name,
                username,
                gender,
                birthday,
                email,
                phone_number,
                mobile,
                address
                )
        )
    return RedirectResponse(url="/Register.jsx", status_code=303)

@app.post("/check_account_exists")
async def check_account_exists(request: Request):
    data = await request.json()
    id_number = data.get("id_number")

    if not id_number:
        return JSONResponse(status_code=400, content={"exists": False, "message": "請提供帳號 (id_number)"})

    result = SQL(
        db="project",
        instruction="SELECT 1 FROM register WHERE id_number=%s",
        SELECT=True,
        SET=(id_number,)
    )

    if result:
        return JSONResponse({"exists": True, "message": "帳號已存在"})
    else:
        return JSONResponse({"exists": False, "message": "帳號未註冊"})

@app.get("/get_ticket_informations")
async def get_ticket_informations(
                            request: Request,
                                    event: str,
                                    type_: str,
                                    zone: str,
                                    quantity : str
                                    ):
    username = request.session.get("USER")
    
    return JSONResponse({"username":username,
                         "event":event,
                         "type_":type_,
                         "zone":zone,
                         "quantity":quantity,
                         "link":"ticket_success.html"})

@app.get("/load_ticket")
async def load_ticket(
                        request: Request,
                        event: str,
                        type_: str,
                        zone: str,
                        quantity : str
                        ):
    username = request.session.get("USER")
    
    SQL(
        db="project",
        instruction = """INSERT INTO ticket(username,event,type_,zone,quantity)
                         VALUES(%s,%s,%s,%s,%s)""",
        SET=(username,event,type_,zone,quantity)
        )
    
@app.get("/ticket_success")
async def ticket_success():
    return JSONResponse({"load_ticket":True})

@app.post("/login")
async def login(
                    username: str = Form(),
                    password: str = Form(),
                    email: str = Form()
                    ):
    result = SQL(
                 db="project",
                 instruction="""SELECT * FROM register 
                                WHERE username=%s AND password=%s AND email=%s""",
                 SELECT=True,
                 SET=(
                        username,
                        password,
                        email
                        )
                 )
    if result:

        return JSONResponse(
                            status_code=200,
                            content={
                                    "login_status":True,
                                    "message":"登入成功",
                                    "username":username
                                     }
                            )
    else:
        return JSONResponse(
                            status_code=200,
                            content={
                                    "login_status":False,
                                    "message":"帳號、密碼或信箱錯誤"
                                     }
                            )
    
@app.post("/login_success")
async def login_success(request:Request):
    data = await request.json()
    username = data["username"]
    request.session["USER"] = username
    return JSONResponse({"username": username})

@app.get("/logout_success")
async def logout_success(request:Request):
    del request.session["USER"]
    return session_check(request.session.get("USER"))

@app.get("/check_login")
async def check_login(request: Request):
    return session_check(request.session.get("USER"))

@app.get("/check_profile")
async def check_profile(request:Request):
    username = request.session.get("USER")
    if username:
        return JSONResponse({"profile_status":True,"profile_link":"profile.html"})
    else:
        return JSONResponse({"profile_status":False,"profile_link":"login.html"})
    
@app.get("/check_ticket")
async def check_ticket(request:Request):
    username = request.session.get("USER")
    if username:
        return JSONResponse({"ticket_status":True,"ticket_link":"ticket.html"})
    else:
        return JSONResponse({"ticket_status":False,"ticket_link":"login.html"})
    
@app.get("/get_informations")
async def get_informations(request:Request):
    
    username = request.session.get("USER")
    
    user_profile = convert_TupleToList(SQL(
                                             db="project",
                                             instruction="""SELECT * FROM register 
                                                            WHERE username=%s""",
                                             SELECT=True,
                                             SET=(username,)
                                             ))[0]
    user_ticket = [convert_TupleToList(SQL(
                                            db="project",
                                            instruction="""SELECT *FROM ticket 
                                                           WHERE username=%s""",
                                            SELECT=True,
                                            SET=(username,)
                                            ))]
    
    informations = user_profile+user_ticket

    informations = dict(zip(["register_index",
                             "username",
                             "id_number",
                             "password",
                             "real_name",
                             "gender",
                             "birthday",
                             "email",
                             "phone_number",
                             "mobile",
                             "address",
                             "ticket"],informations))
    
    return JSONResponse(informations)

@app.post("/hot_event")
async def hot_event():
    html = "https://tixcraft.com"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36"
    }

    try:
        r = requests.get(html + "/activity", headers=headers, timeout=10)
        r.raise_for_status()
    except requests.RequestException as e:
        return JSONResponse(status_code=500, content={"error": "連線失敗", "detail": str(e)})

    t = bs(r.text, "lxml")
    t1 = t.find("div", {"id": "all"})
    if not t1:
        return JSONResponse(status_code=404, content={"error": "找不到活動區塊，可能是 Render IP 被封鎖或頁面結構改變"})

    t1 = t1.find_all("div", {"class": "row align-items-center"})
    result = {}

    for index, data in enumerate(t1):
        try:
            href = html + data.find("div", {"class": "text-bold pt-1 pb-1"}).find("a").get("href")
            picture = data.find("img").get("src")
            date = data.find("div", {"class": "text-small date"}).text.strip()
            name = data.find("div", {"class": "text-bold pt-1 pb-1"}).find("a").text.strip()

            result.update({
                index + 1: {
                    "name": name,
                    "date": date,
                    "picture": picture,
                    "href": href
                }
            })
        except Exception as e:
            result.update({index + 1: {"error": "部分資料解析失敗", "detail": str(e)}})

    return JSONResponse(result)


@app.get("/hot_event/intro")
@app.get("/hot_event/note")
@app.get("/hot_event/buy-note")
@app.get("/hot_event/get-note")
@app.get("/hot_event/refund-note")
@app.post("/hot_event/informations")#改成四個api分別處理
async def hot_event_informations(request:Request):
    
    def informations(Input):
        '''抓取資料的方式需要再改善
        img:src 抓到後放到前端上
        a:href 抓到後顯示藍色
        項目符號需要被抓取到
        版面調整
        '''
        t1 = t.find("div",{"id":Input})
        result = []
        
        for tag in t1.find_all():#尋找所有的標籤
            for child in tag.contents:
                if isinstance(child, NavigableString) and child.strip():
                    result.append(child)
        return result
       
    hot_event = await request.json()
    
    keyword = {"節目介紹":"intro","注意事項":"note","購票提醒":"buy-note","取票提醒":"get-note","退票說明":"refund-note"}
    r = requests.get(hot_event.get("href"))
    t = bs(r.text,"lxml")
    
    intro = informations(keyword.get("節目介紹"))
    note = informations(keyword.get("注意事項"))
    buy_note = informations(keyword.get("購票提醒"))
    get_note = informations(keyword.get("取票提醒"))
    refund_note = informations(keyword.get("退票說明"))
    
    return JSONResponse({"intro":intro,"note":note,"buy-note":buy_note,"get-note":get_note,"refund-note":refund_note})
    
#=======================================================================
app.mount("/",StaticFiles(directory="Frontend",html=True))

from fastapi import FastAPI,Path,Query,Form,Request
from starlette.middleware.sessions import SessionMiddleware
from typing import Annotated
from fastapi.responses import JSONResponse,PlainTextResponse,HTMLResponse,FileResponse,RedirectResponse 
from fastapi.staticfiles import StaticFiles
import pymysql
import os
from dotenv import load_dotenv

app = FastAPI()

'''
USER = "root"
PASSWORD = "QqAboztnLkfYyJgpisWGHYbQiUkZYRxE"
HOST = "centerbeam.proxy.rlwy.net"
PORT = 21732
DATABASE = "main"
KEY = "ticket_key"
'''

load_dotenv()
USER = os.getenv("MYSQLUSER")
PASSWORD = os.getenv("MYSQLPASSWORD")
HOST = os.getenv("MYSQLHOST")
PORT = int(os.getenv("MYSQLPORT"))
DATABASE = os.getenv("MYSQLDATABASE")
KEY = "ticket_key"

app.add_middleware(SessionMiddleware,secret_key=KEY)

def convert_TupleToList(data):
    return list(map(lambda _:list(_),data))

def SQL(db, instruction, SELECT=False, SET=None):
    con = pymysql.connect(
        user=USER,
        password=PASSWORD,
        host=HOST,
        port = PORT,
        database=DATABASE
    )
    cur = con.cursor()
    if SELECT:
        cur.execute(instruction, SET)
        result = cur.fetchall()
        con.close()
        return result
    else:
        if SET:
            cur.execute(instruction, SET)
        else:
            cur.execute(instruction)
        con.commit()
        con.close()
        
def session_check(username):
    if username:
        return JSONResponse({"login_status": True, "username": username,"message": "您好，"+username})
    else:
        return JSONResponse({"login_status": False, "message":"尚未登入"})

@app.post("/account_created")
async def account_created(
    username: str = Form(),
    id_number: str = Form(),
    password: str = Form(),
    real_name: str = Form(),
    gender: str = Form(),
    birthday: str = Form(),
    email: str = Form(),
    phone_number: str = Form(),
    mobile: str = Form(),
    address: str = Form()
):
    SQL(
        db="project",
        instruction="""INSERT INTO register(username,id_number,password,real_name,gender,
                                            birthday,email,phone_number,mobile,address)
                       VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
        SET=(
                id_number,
                password,
                real_name,
                username,
                gender,
                birthday,
                email,
                phone_number,
                mobile,
                address
                )
        )
    return RedirectResponse(url="/account_created.html", status_code=303)

@app.post("/check_account_exists")
async def check_account_exists(request: Request):
    data = await request.json()
    id_number = data.get("id_number")

    if not id_number:
        return JSONResponse(status_code=400, content={"exists": False, "message": "請提供帳號 (id_number)"})

    result = SQL(
        db="project",
        instruction="SELECT 1 FROM register WHERE id_number=%s",
        SELECT=True,
        SET=(id_number,)
    )

    if result:
        return JSONResponse({"exists": True, "message": "帳號已存在"})
    else:
        return JSONResponse({"exists": False, "message": "帳號未註冊"})

@app.get("/get_ticket_informations")
async def get_ticket_informations(
                            request: Request,
                                    event: str,
                                    type_: str,
                                    zone: str,
                                    quantity : str
                                    ):
    username = request.session.get("USER")
    
    return JSONResponse({"username":username,
                         "event":event,
                         "type_":type_,
                         "zone":zone,
                         "quantity":quantity,
                         "link":"ticket_success.html"})

@app.get("/load_ticket")
async def load_ticket(
                        request: Request,
                        event: str,
                        type_: str,
                        zone: str,
                        quantity : str
                        ):
    username = request.session.get("USER")
    
    SQL(
        db="project",
        instruction = """INSERT INTO ticket(username,event,type_,zone,quantity)
                         VALUES(%s,%s,%s,%s,%s)""",
        SET=(username,event,type_,zone,quantity)
        )
    
@app.get("/ticket_success")
async def ticket_success():
    return JSONResponse({"load_ticket":True})

@app.post("/login")
async def login(
                    username: str = Form(),
                    password: str = Form(),
                    email: str = Form()
                    ):
    result = SQL(
                 db="project",
                 instruction="""SELECT * FROM register 
                                WHERE username=%s AND password=%s AND email=%s""",
                 SELECT=True,
                 SET=(
                        username,
                        password,
                        email
                        )
                 )
    if result:

        return JSONResponse(
                            status_code=200,
                            content={
                                    "login_status":True,
                                    "message":"登入成功",
                                    "username":username
                                     }
                            )
    else:
        return JSONResponse(
                            status_code=200,
                            content={
                                    "login_status":False,
                                    "message":"帳號、密碼或信箱錯誤"
                                     }
                            )
    
@app.post("/login_success")
async def login_success(request:Request):
    data = await request.json()
    username = data["username"]
    request.session["USER"] = username
    return JSONResponse({"username": username})

@app.get("/logout_success")
async def logout_success(request:Request):
    del request.session["USER"]
    return session_check(request.session.get("USER"))

@app.get("/check_login")
async def check_login(request: Request):
    return session_check(request.session.get("USER"))

@app.get("/check_profile")
async def check_profile(request:Request):
    username = request.session.get("USER")
    if username:
        return JSONResponse({"profile_status":True,"profile_link":"profile.html"})
    else:
        return JSONResponse({"profile_status":False,"profile_link":"login.html"})
    
@app.get("/check_ticket")
async def check_ticket(request:Request):
    username = request.session.get("USER")
    if username:
        return JSONResponse({"ticket_status":True,"ticket_link":"ticket.html"})
    else:
        return JSONResponse({"ticket_status":False,"ticket_link":"login.html"})
    
@app.get("/get_informations")
async def get_informations(request:Request):
    
    username = request.session.get("USER")
    
    user_profile = convert_TupleToList(SQL(
                                             db="project",
                                             instruction="""SELECT * FROM register 
                                                            WHERE username=%s""",
                                             SELECT=True,
                                             SET=(username,)
                                             ))[0]
    user_ticket = [convert_TupleToList(SQL(
                                            db="project",
                                            instruction="""SELECT *FROM ticket 
                                                           WHERE username=%s""",
                                            SELECT=True,
                                            SET=(username,)
                                            ))]
    
    informations = user_profile+user_ticket

    informations = dict(zip(["register_index",
                             "username",
                             "id_number",
                             "password",
                             "real_name",
                             "gender",
                             "birthday",
                             "email",
                             "phone_number",
                             "mobile",
                             "address",
                             "ticket"],informations))
    
    return JSONResponse(informations)
#=======================================================================
app.mount("/",StaticFiles(directory="Frontend",html=True))

