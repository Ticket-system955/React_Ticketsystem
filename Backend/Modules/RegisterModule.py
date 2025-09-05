async def ShowQRcode(request,reqT,totpT):
    response = await reqT.GetJson(request=request)
    if response["status"]:
        try:
            data = response["data"]
            email = data["email"]
            
            GetSecret_result = totpT.GetSecret(request=request)
            if not GetSecret_result["status"]:
                return GetSecret_result
            secret = GetSecret_result["secret"]
            
            GetTotpObject_result = totpT.GetTotpObject(secret=secret)
            if not GetTotpObject_result["status"]:
                return GetTotpObject_result
            totpobject = GetTotpObject_result["totpobject"]

            GetUri_result =  totpT.GetUri(totpobject=totpobject,email=email)
            if not GetUri_result["status"]:
                return GetUri_result
            uri = GetUri_result["uri"]

            
            GetQRcodeSrc_result = totpT.GetQRcodeSrc(uri=uri)
            if not GetQRcodeSrc_result["stauts"]
                return GetQRcodeSrc_result
            qrcodesrc = GetQRcodeSrc_result["qrcodesrc"]
            
            return {"status":True,"totpsrc":qrcodesrc}
            
        except Exception as e:
            return {"status":False,
                    "notify":f"RegisterModule.ShowQRcodeError ! message : [{type(e)} {e}]"}
    return response
    
async def CheckANDRegister(request,reqT,sqlT,totpT):
    response = await reqT.GetJson(request=request)
    if response["status"]:
        try:
            data = response["data"]
            login_id = data["login_id"]
            IdType = data["IdType"]
            loginType = data["loginType"]
            password = data["password"]
            name = data["name"]
            gender = data["gender"]
            birthday = data["birthday"]
            email = data["email"]
            phone_number = data["phone_number"]
            mobile_number = data["mobile_number"]
            address = data["address"]
            user_input = data["user_input"]
            
            GetSecret_result = totpT.GetSecret(request=request)
            if not GetSecret_result["status"]:
                return GetSecret_result
            secret = GetSecret_result["secret"]
            
            GetTotpObject_result = totpT.GetTotpObject(secret=secret)
            if not GetTotpObject_result["status"]:
                return GetTotpObject_result
            totpobject = GetTotpObject_result["totpobject"]
            
            if user_input==totpobject.now():
                InsertRegisterData_result = sqlT.InsertRegisterData(login_id,IdType,loginType,password,name,gender,
                                                                    birthday,email,phone_number,mobile_number,address,secret)
                if not InsertRegisterData_result["status"]:
                    return InsertRegisterData_result
    
                del request.session["secret"]
                
                return {"status":True,
                        "notify":"註冊成功 !"}
            else:
                return {"status":False,
                        "notify":"註冊失敗 !"}
 
        except Exception as e:
            return {"status":False,
                    "notify":f"RegisterModule.CheckANDRegisterError ! message : [{type(e)} | {e}]"}
    return response
