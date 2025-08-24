async def ShowQRcode(request,reqT,totpT):
    response = await reqT.GetJson(request=request)
    if response["status"]:
        try:
            data = response["data"]
            email = data["email"]
            secret = totpT.GetSecret(request=request)
            totpobject = totpT.GetTotpObject(secret=secret)
            uri = totpT.GetUri(totpobject=totpobject,email=email)
            src = totpT.GetQRcodeSrc(uri=uri)
            return {"status":True,"totpsrc":src}
        except Exception as e:
            return {"status":False,
                    "notify":f"ShowQRcodeError ! message : [{type(e)} {e}]"}
    return {"status":False}
    
async def CheckANDRegister(request,reqT,sqlT,totpT):
    return {"status":True}
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
            
            secret = request.session["secret"]
            totpobject = totpT.GetTotpObject(secret=secret)
            
            if user_input==totpobject.now():
                InsertRegisterData_result = sqlT.InsertRegisterData(login_id,IdType,loginType,password,name,gender,
                                                                    birthday,email,phone_number,mobile_number,address,secret)
                if not InsertRegisterData_result["status"]:
                    return InsertRegisterData_result
    
                del request.session["secret"]
                
                return {"status":True,
                        "notify":"註冊成功 !",
                        "secret":secret}
            else:
                return {"status":False,
                        "notify":"註冊失敗 !"}
 
        except Exception as e:
            return {"status":False,
                    "notify":f"CheckANDRegisterError ! message : [{type(e)} | {e}]"}
    return response
