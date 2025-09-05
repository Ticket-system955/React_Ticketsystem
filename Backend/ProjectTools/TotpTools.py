import pyotp
import qrcode
import io
import base64

'''取得使用者註冊時的QRcode
    用於購票'''
class TotpTools:
    
    '''
    1.使用時機:欲取得密鑰時
    2.功能:回傳密鑰
    3.說明:取得成功
             則回傳->{"status":True,
                    "notify":"secret取得成功 !",
                    "secret":secret}
           例外處理
             回傳->{"status":False,
                    "notify":f"TotpTools.GetSecretError ! message : [{type(e)} | {e}]"}
    '''
    def GetSecret(self,request):
        try:
            secret = pyotp.random_base32()
            request.session["secret"] = secret
            return {"status":True,
                    "notify":"secret取得成功 !",
                    "secret":secret}
        except Exception as e:
            return {"status":False,
                    "notify":f"TotpTools.GetSecretError ! message : [{type(e)} | {e}]"}

    '''
    1.使用時機:欲取得Totp物件時
    2.功能:回傳Totp物件
    3.說明:若取得成功
            則回傳->{"status":True,
                    "notify":"totpobject取得成功 !"
                    "totpobject":totpobject}
            例外處理
              回傳->{"status":False,
                    "notify":f"TotpTools.GetTotpObjectError !"}
    '''
    def GetTotpObject(self,secret):
        try:
            totpobject = pyotp.TOTP(secret)
            return {"status":True,
                    "notify":"totpobject取得成功 !"
                    "totpobject":totpobject}
        except Exception as e:
            return {"status":False,
                    "notify":f"TotpTools.GetTotpObjectError ! message : [{type(e)} | {e}]"}
    '''
    1.使用時機:欲取得Uri時
    2.功能:回傳Uri
    3.說明:若取得成功
             則回傳->{"status":True,
                     "notify":"url取得成功 !"
                     "totpobject":totpobject}
            例外處理
              回傳->{"status":False,
                    "notify":f"TotpTools.GetUriError !"}
    '''
    '''URI 全名是 Uniform Resource Identifier，中文一般翻成「統一資源識別符」。
        可以把它想像成網路世界的「身分證字號」或「門牌地址」，用來唯一標示一個資源。'''
    def GetUri(self,totpobject,email):
        try:
            uri = totpobject.provisioning_uri(name=email, issuer_name="GJun訂票平台")
            return {"status":True,
                    "notify":"Url取得成功 !"
                    "uri":uri}
        except Exception as e:
            return {"status":False,
                    "notify":f"TotpTools.GetUriError ! message : [{type(e)} | {e}]"}

    '''
    1.使用時機:欲取得QRcode的src資料時
    2.功能:回傳QRcode的src資料
    3.說明:若取得成功
             則回傳->{"status":True,
                     "notify":"qrcodesrc取得成功",
                     "qrcodesrc":qrcodesrc}
            例外處理
              回傳->{"status":False,
                    "notify":f"TotpTools.GetQRcodeSrcError !"}
    '''
    def GetQRcodeSrc(self,uri):
        try:
            imgio = io.BytesIO()
            img = qrcode.make(uri)
            img.save(imgio, format='PNG')
            imgio.seek(0)
            base64img = base64.b64encode(imgio.read()).decode('utf-8')
            qrcodesrc = f"data:image/png;base64,{base64img}"
        return {"status":True,
                "notify":"qrcodesrc取得成功",
                "qrcodesrc":qrcodesrc}
            return {"status":False,
                    "notify":f"TotpTools.GetQRcodeSrcError ! message : [{type(e)} | {e}]"}
