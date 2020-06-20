# SERVICIO WEB SCRAPING
Este es un pequeño servidor de express básico que permite hacer web scraping utilizando la libreria puppeteer.

### EndPoints:
**GET validaDocumentoSolicitaCaptcha:** Permite rescatar la captcha del registro civil.
Respuesta
```
{
    "browserId": "eb0e1a3e-7060-4a35-9ad3-2947235c05fd",
    "pageId": "5F3221409F4B900AAEFE3DDA0D35BA81",
    "archivo": "captcha.png",
    "base64": "imagen_captcha_codificada"
}
```
**POST validaDocumento:** Envia el resto de parámetros junto a la captcha para saber si el documento se encuentra vigente o no. La información que se envía funciona en conjunto con el servicio validaDocumentoSolicitaCaptcha.
Parámetros:
```
{
    "browserId": "eb0e1a3e-7060-4a35-9ad3-2947235c05fd",
    "pageId": "5F3221409F4B900AAEFE3DDA0D35BA81",
    "run": "1-9",
    "tipo_documento": "CEDULA",
    "numero_documento": "999999999",
    "captcha_txt": "xxxxx"
}
```

Una vez descargado se deben instalar los módulos de Node con el comando:

```
npm install
```