import pymysql
from urllib.parse import urlparse

#建立連線
class SqlBase:
    def __init__(self,url):
        self.url = urlparse(url)
        self.user = self.url.username
        self.password = self.url.password
        self.host = self.url.hostname
        self.port = self.url.port
        self.database = self.url.path.lstrip("/")
    def Execution(self, INSTRUCTION, SELECT=False, SET=None):
        con = pymysql.connect(
            user=self.user,
            password=self.password,
            host=self.host,
            port=self.port,
            database=self.database
        )
        cur = con.cursor()
        if SELECT:
            cur.execute(INSTRUCTION, SET)
            result = cur.fetchall()
            con.close()
            return result
        else:
            if SET:
                cur.execute(INSTRUCTION, SET)
            else:
                cur.execute(INSTRUCTION)
            con.commit()
            con.close()
    def TupleToList(self,data):
        return list(map(lambda _:list(_),data))
    
    def seatCellToLabel(self,ticket):
        for i in range(len(ticket)):
            seat = ticket[i]
            column = seat.pop()
            row = seat.pop()
            area = seat.pop()
            seat+=[f"{area} | 第{row}排 第{column}位"]
            ticket[i] = seat
        return ticket


#功能
#繼承父類別
class SqlTools(SqlBase):
    
    def __init__(self,URL):
        super().__init__(URL)
        
#ProfileModule
#------------------------------------------------------------------------------------
    #取得使用者資料
    def GetProfileData(self,profileColumn,loginID):
        try:
            INSTRUCTION=f"""SELECT {",".join(profileColumn)}
                            FROM register 
                            WHERE login_id=%s"""
            SET=(loginID,)
            profileData = self.TupleToList(self.Execution(INSTRUCTION=INSTRUCTION,SELECT=True,SET=SET))[0]
    
            return {"status":True,
                    "profileData":profileData}
        except Exception as e:
            return {"status":False,
                    "notify":f"GetProfileDataError ! message : [{type(e)} | {e}]"}
            
    #取得購票紀錄
    def GetTicketData(self,registerID,ticketColumn):
        try:
            INSTRUCTION=f"""SELECT {",".join(ticketColumn)} 
                            FROM ticket
                            INNER JOIN `event` 
                            ON  `event`.id = ticket.event_id 
                            WHERE register_id = %s"""                  
            SET=(registerID,)
            ticketData = self.seatCellToLabel(self.TupleToList(self.Execution(INSTRUCTION=INSTRUCTION,SELECT=True,SET=SET)))
        
            return {"status":True,
                    "ticketData":ticketData}
        except Exception as e:
            return {"status":False,
                    "notify":f"GetTicketDataError ! message : [{type(e)} | {e}]"}
    
#------------------------------------------------------------------------------------

#LoginModule
#------------------------------------------------------------------------------------
    #取得帳號、密碼
    def GetUserData(self,loginIDInput,passwordInput):
        try:
            INSTRUCTION="""SELECT login_id,password FROM register
                           WHERE login_id=%s AND password=%s"""
            SET=(loginIDInput,passwordInput)
            userData = self.Execution(INSTRUCTION=INSTRUCTION,SELECT=True,SET=SET)
            return {"status":True,
                    "userData":userData}
        
        except Exception as e:
            return {"status":False,
                    "notify":f"GetUserDataError ! message : [{type(e)} | {e}]"}
        
    #取得姓名
    def GetUserName(self,loginIDInput,passwordInput):
        try:
            INSTRUCTION="""SELECT name FROM register 
                           WHERE login_id=%s AND password=%s"""
            SET=(loginIDInput,passwordInput)
            userName = self.Execution(INSTRUCTION=INSTRUCTION,SELECT=True,SET=SET)[0][0]
            return {"status":True,
                    "userName":userName}
        except Exception as e:
            return {"status":False,
                    "notify":f"GetUserNameError ! message : [{type(e)} | {e}]"}

    #取得註冊編號
    def GetRegisterID(self,loginIDInput,passwordInput):
        try:
            INSTRUCTION="""SELECT id FROM register 
                           WHERE login_id=%s AND password=%s"""
            SET=(loginIDInput,passwordInput)
            
            registerID = self.Execution(INSTRUCTION=INSTRUCTION,SELECT=True,SET=SET)[0][0]
            return {"status":True,
                    "registerID":registerID}
        except Exception as e:
            return {"status":False,
                    "notify":f"GetUserIDError ! message : [{type(e)} | {e}]"}
#------------------------------------------------------------------------------------

#RegisterModule
#------------------------------------------------------------------------------------
    #存入註冊資料
    def InsertRegisterData(self,loginID,password,name,gender,birthday,
                           email,phone_number,mobile_number,address,secret):
        try:
            INSTRUCTION = """INSERT INTO register(login_id,password,name,gender,birthday,
                                                  email,phone_number,mobile_number,address,secret)
                             VALUES(%s,%s,%s,%s,%s,
                                    %s,%s,%s,%s,%s)"""
            SET=(loginID,password,name,gender,birthday,
                 email,phone_number,mobile_number,address,secret)
            
            self.Execution(INSTRUCTION=INSTRUCTION,SET=SET)
            return {"status":True}
        except Exception as e:
            return {"status":False,
                    "notify":f"InsertRegisterDataError ! message : [{type(e)} {e}]"}
#------------------------------------------------------------------------------------

#TicketModule
#------------------------------------------------------------------------------------
    #取得密鑰
    def GetSecret(self,loginID):
        try:
            INSTRUCTION = """SELECT secret
                             FROM   register 
                             WHERE  login_id=%s"""
            SET = (loginID,)
            
            secret = self.Execution(INSTRUCTION=INSTRUCTION,SELECT=True,SET=SET)[0][0]
            return {"status":True,
                    "secret":secret}
        
        except Exception as e:
            return {"status":False,
                    "notify":f"GetSecretError ! message : [{type(e)} | {e}]"}

    #存入票券資料
    def InsertTicketData(self,registerID,event_id,area,row,column):
        try:
            INSTRUCTION = """INSERT INTO ticket(register_id,event_id,area,`row`,`column`)
                             VALUES(%s,%s,%s,%s,%s)"""
            SET = (registerID,event_id,area,row,column)
            
            self.Execution(INSTRUCTION=INSTRUCTION,SET=SET)
            return {"status":True}
        
        except Exception as e:
            return {"status":False,
                    "notify":f"InsertTicketDataError ! message : [{type(e)} | {e}]"}

    #取得活動編號
    def GetEventID(self,title):
        try:
            INSTRUCTION = """SELECT id FROM event 
                             WHERE title=%s"""
            SET = (title,)
            
            event_id = self.Execution(INSTRUCTION=INSTRUCTION,SELECT=True,SET=SET)[0][0]
            return {"status":True,
                    "event_id":event_id}
        
        except Exception as e:
            return {"status":False,
                    "notify":f"GetEventIDError ! message : [{type(e)} | {e}]"}

    #取得活動的所有購票紀錄
    def GetPurchasedData(self,event_id):
        try:
            INSTRUCTION = """SELECT area,`row`,`column` FROM `event` 
                             INNER JOIN ticket 
                             ON `event`.id = ticket.event_id 
                             WHERE event_id = %s"""
            SET=(event_id,)
            
            purchasedData = list(self.Execution(INSTRUCTION=INSTRUCTION,SELECT=True,SET=SET))
            return {"status":True,
                    "purchasedData":purchasedData}
        
        except Exception as e:
            return {"status":False,
                    "notify":f"GetPurchasedDataError ! message : [{type(e)} | {e}]"}

#------------------------------------------------------------------------------------
