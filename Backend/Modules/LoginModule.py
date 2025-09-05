async def Check(request,reqT,sqlT):
    response = await reqT.GetJson(request=request)#取得前端回傳的資料
    
    if response["status"]:#若前端資料取得成功，則...
        try:
            data = response["data"]#取出資料
            login_idInput = data["login_id"]#使用者輸入的身分證字號(帳號)
            passwordInput = data["password"]#使用者輸入的密碼

            GetUserData_result = sqlT.GetUserData(loginIDInput=login_idInput,passwordInput=passwordInput)#取得結果
            
            if not GetUserData_result["status"]:#若取得失敗
                return GetUserData_result#則回傳錯誤訊息(GetUserDataError)
            
            userData = GetUserData_result["userData"]#成功則取出使用者帳號、密碼資料
            if userData:#若有資料，表示使用者的輸入正確
                
                GetUserName_result = sqlT.GetUserName(loginIDInput=login_idInput,passwordInput=passwordInput)#取得結果
                if not GetUserName_result["status"]:#若取得失敗
                    return GetUserName_result#則回傳錯誤訊息(GetUserNameError)
                    
                userName = GetUserName_result["userName"]#成功則取出使用者真實姓名

                GetUserID_result = sqlT.GetRegisterID(loginIDInput=login_idInput,passwordInput=passwordInput)#取得使用者的註冊編號
                if not GetUserID_result:#若取得失敗
                    return GetUserID_result#則回傳錯誤訊息(GetUserIDError)
                registerID = GetUserID_result["registerID"]#成功則取出使用者的註冊編號

                #加入session
                request.session["UserID"] = login_idInput
                request.session["UserName"] = userName
                request.session["RegisterID"] = registerID

                '''確認回傳資料，是否可以修改'''
                return{"status":True,
                       "notify":"登入成功 !",
                       "UserID":login_idInput,#***
                       "UserName":userName,#***
                       "RegisterID":registerID#***}
                
            else:#否則輸入不正確
                return{"status":False,
                       "notify":"登入失敗 !"}
        
        except Exception as e:#例外處理
            return {"status":False,
                    "notify":f"CheckError ! message : [{type(e)} | {e}]"}
    return response#否則前端資料取得失敗(GetJsonError)
