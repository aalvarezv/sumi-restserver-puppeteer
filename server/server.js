const puppeteer = require('puppeteer');
const chromeOptions = {
    headless: false,
    defaultViewport: null,
    slowMo: 80,
};

require('./config/config')
const express = require('express')
const bodyParser = require('body-parser')
const app = express()

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))
    // parse application/json
app.use(bodyParser.json())

let browser = null;
let page = null;
app.get('/validaDocumentoSolicitaCaptcha', function(req, res) {

    (async function main() {
        browser = await puppeteer.launch(chromeOptions);
        page = await browser.newPage();

        await page.goto('https://portal.sidiv.registrocivil.cl/usuarios-portal/pages/DocumentRequestStatus.xhtml', {
            waitUntil: ["networkidle2"]
        });

        //obtiene el primer img dentro del div id='form:captchaPanel'
        const elements = await page.$$("[id='form:captchaPanel'] img");
        //graba la imagen en el disco local
        //await elements[0].screenshot({ path: "captcha4.png" })
        //obtiene la imagen en base64
        const screenshotb64 = await elements[0].screenshot({ encoding: "base64" });
        //Envia mensaje al cliente con la screen en base64 de la captcha
        res.json({
            archivo: 'captcha.png',
            base64: screenshotb64
        });

    })()

});

app.post('/validaDocumento', async function(req, res) {

    if (page === null) {
        res.status(400).json({
            mensaje: 'No ha solicitado la captcha'
        })
    }

    let body = req.body;
    if (body !== undefined) {
        await page.type("[name='form:run']", body.run);
        await page.select("[name='form:selectDocType']", body.tipo_documento);
        await page.type("[name='form:docNumber']", body.numero_documento);
        await page.type("[name='form:inputCaptcha']", body.captcha_txt);
        await page.evaluate(() => checkFields());
        //Una vez que hace clic verifica si se levanta un popup con mensajes de la web.
        const popupError = await page
            .waitForSelector("[id='confirmError']", {
                timeout: 1000
            })
            .then((element) => {
                //console.log(`Error al validar documento`);
                return element;
            }, (error) => {
                //console.log(`Validación correcta`);
                return null;
            });

        //Selecciona para sacar el mensaje del popup.
        let selector = "[id='confirmError'] [class='generalText']";
        if (popupError == null) {
            //Selecciona para sacar el estado del documento.
            selector = "[class='setWidthOfSecondColumn']";
        }

        const resp = await page
            .waitForSelector(selector, {
                timeout: 1000
            })
            .then((element) => {
                return {
                    estado: 100,
                    elemento: element,
                    mensaje: `OK selector ${selector}`
                };
            }, (error) => {
                return {
                    estado: 0,
                    elemento: null,
                    mensaje: error
                };
            });

        if (resp.estado == 100) {
            const mensaje = await (await resp.elemento.getProperty('textContent')).jsonValue();
            //Si el popup no existe, entonces pasó la validación y no hay error.
            if (popupError == null) {
                console.log({ error: 0, mensaje });
                res.json({ error: 0, mensaje });
            } else {
                //Si el popup existe, entonces error.
                console.log({ error: 100, mensaje });
                res.json({ error: 100, mensaje });
            }
        } else {
            console.log({ error: 100, mensaje: resp.error });
            res.json({ error: 100, mensaje: resp.error });
        }

        await browser.close();

    }

});

app.listen(process.env.PORT, () => {
    console.log(`Escuchando puerto ${process.env.PORT}`)
})