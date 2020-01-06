Este es un pequeño servidor de express básico que permite hacer web scraping utilizando la libreria puppeteer.

Servicios:
GET validaDocumentoSolicitaCaptcha: Permite rescatar la captcha del registro civil.
POST validaDocumento: Envia el resto de parámetros junto a la captcha para saber si el documento se encuentra vigente o no.

Una vez descargado se deben instalar los módulos de Node con el comando:

```
npm install
```