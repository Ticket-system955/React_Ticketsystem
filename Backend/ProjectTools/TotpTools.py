import pyotp
import qrcode
import io
import base64

'''取得使用者註冊時的QRcode
    用於購票'''
class TotpTools:
    
    '''系統產生一組密鑰給使用者'''
    def GetSecret(self,request):
        secret = pyotp.random_base32()
        request.session["secret"] = secret
        return secret

    '''利用密鑰，轉換成Totp的物件'''
    def GetTotpObject(self,secret):
        totpobject = pyotp.TOTP(secret)
        return totpobject

    '''使用Totp物件，取得uri'''
    '''URI 全名是 Uniform Resource Identifier，中文一般翻成「統一資源識別符」。
        可以把它想像成網路世界的「身分證字號」或「門牌地址」，用來唯一標示一個資源。'''
    def GetUri(self,totpobject,email):
        uri = totpobject.provisioning_uri(name=email, issuer_name="GJun訂票平台")
        return uri

    '''使用url，製作QRcode'''
    def GetQRcodeSrc(self,uri):
        imgio = io.BytesIO()
        img = qrcode.make(uri)
        img.save(imgio, format='PNG')
        imgio.seek(0)
        base64img = base64.b64encode(imgio.read()).decode('utf-8')
        qrcodesrc = f"data:image/png;base64,{base64img}"
        return qrcodesrc
