#判斷使用者登入狀態
def CheckUserLogin(request):
    if "UserID" in request.session and "UserName" in request.session and "RegisterID" in request.session:
        return {"status":True,
                "notify":"已經是登入狀態 !",
                "session":request.session["UserName"],
                "ID":request.session["RegisterID"]}
    return {"status":False,
            "notify":"尚未登入 !",
            "session":"尚未登入"}
