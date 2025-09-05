async def Logout(request):
    for key in ["UserName", "UserID", "RegisterID"]:
        request.session.pop(key, None)
        
    return {"status": True,
            "notify": "登出成功 !",
            "session": "尚未登入"}
