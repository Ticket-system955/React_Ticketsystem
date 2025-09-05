async def Check(request,reqT,sqlT):
    response = await reqT.GetJson(request=request)
    
    if response["status"]:
        try:
            data = response["data"]
            loginIDInput = data["login_id"]
            passwordInput = data["password"]

            GetUserData_result = sqlT.GetUserData(loginIDInput=loginIDInput,passwordInput=passwordInput)
            
            if not GetUserData_result["status"]:
                return GetUserData_result
            
            userData = GetUserData_result["userData"]
            if userData:
                
                GetUserName_result = sqlT.GetUserName(loginIDInput=loginIDInput,passwordInput=passwordInput)
                if not GetUserName_result["status"]:
                    return GetUserName_result
                userName = GetUserName_result["userName"]

                GetUserID_result = sqlT.GetRegisterID(loginIDInput=loginIDInput,passwordInput=passwordInput)
                if not GetUserID_result:
                    return GetUserID_result
                registerID = GetUserID_result["registerID"]

                request.session["UserID"] = loginIDInput
                request.session["UserName"] = userName
                request.session["RegisterID"] = registerID
                
                return{"status":True,
                       "notify":"登入成功 !",
                       "UserID":loginIDInput,
                       "UserName":userName,
                       "RegisterID":registerID}
            else:
                return{"status":False,
                       "notify":"登入失敗 !"}
        except Exception as e:
            return {"status":False,
                    "notify":f"CheckError ! message : [{type(e)} | {e}]"}
    return response
