import pyotp
import qrcode
import io
import base64

#取得Totp相關物件
class TotpTools:

    #系統產生密鑰
    def GetSecret(self,request):
        secret = pyotp.random_base32()
        request.session["secret"] = secret
        return secret

    #取得Totp物件
    def GetTotpObject(self,secret):
        totpobject = pyotp.TOTP(secret)
        return totpobject

    #取得Uri
    def GetUri(self,totpobject,email):
        uri = totpobject.provisioning_uri(name=email, issuer_name="GJun訂票平台")
        return uri

    #取得Qrcode
    def GetQRcodeSrc(self,uri):
        imgio = io.BytesIO()
        img = qrcode.make(uri)
        img.save(imgio, format='PNG')
        imgio.seek(0)
        base64img = base64.b64encode(imgio.read()).decode('utf-8')
        qrcodesrc = f"data:image/png;base64,{base64img}"
        return qrcodesrc
