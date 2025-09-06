from fastapi.encoders import jsonable_encoder

#取得使用者資料
def GetProfileData(request,sqlT):
    try:
        loginID = request.session["UserID"]
        
        profileColumn = ["login_id","name","gender","birthday",
                         "email","phone_number","mobile_number","address"]
        
        ticketColumn = ["title","date","location",
                        "area","`row`","`column`"]
        
        registerID = request.session["RegisterID"]
        
        GetProfileData_result = sqlT.GetProfileData(profileColumn=profileColumn,loginID=loginID)
        if not GetProfileData_result["status"]:
            return GetProfileData_result
        profileData = GetProfileData_result["profileData"]

        GetTicketData_result = sqlT.GetTicketData(registerID=registerID,ticketColumn=ticketColumn)
        if not GetTicketData_result["status"]:
            return GetTicketData_result
        ticketData = GetTicketData_result["ticketData"]

        profileData = dict(zip(profileColumn+["ticket"],profileData+[ticketData]))
        userID = request.session["UserID"]
        userName = request.session["UserName"]
        return {"status":True,
                "notify":"會員資料提取完成 !",
                "profileData":jsonable_encoder(profileData)}
    
    except Exception as e:
        return {"status":True,
                "notify":f"GetProfileDataError ! message : [{type(e)} | {e}]"}
