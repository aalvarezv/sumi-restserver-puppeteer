const puppeteer = require('puppeteer-core');
const { getExecutablePath } = require('./util/utils');

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

    (async function run() {
        const executablePath = await getExecutablePath({});
        await lauchpuppeteer({ executablePath });
    })();

    const lauchpuppeteer = async launchOptions => {
        if (browser === null) {
            browser = await puppeteer.launch({
                defaultViewport: null,
                headless: false,
                slowMo: 80,
                openInExistingWindow: true,
                args: [
                    '--disable-background-timer-throttling',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-renderer-backgrounding',
                    '--no-sandbox'
                ],
                ...launchOptions
            });
        }

        //const [page] = await browser.Page(); abre 1 pagina a la vez y la cierra
        page = await browser.newPage();
        //obtiene el targetid del browser para devolver en la respuesta.
        let browserTargetId = browser.target()._targetId;
        //obtiene el targetid de la pagina para devolver en la respuesta.
        let pageTargetId = page.target()._targetId;
        try {
            await page.goto('https://portal.sidiv.registrocivil.cl/usuarios-portal/pages/DocumentRequestStatus.xhtml', {
                waitUntil: "networkidle0",
                timeout: 30000
            });
        } catch (e) {
            console.log(e.message);
            res.status(504).json({
                error: 100,
                mensaje: e.message
            });
            return;
        }
        //obtiene el primer img dentro del div id='form:captchaPanel'
        const elements = await page.$$("[id='form:captchaPanel'] img");
        //graba la imagen en el disco local
        //await elements[0].screenshot({ path: "captcha4.png" })
        //obtiene la imagen en base64
        const screenshotb64 = await elements[0].screenshot({ encoding: "base64" });
        //Envia mensaje al cliente con la screen en base64 de la captcha
        res.status(200).json({
            browserId: browserTargetId,
            pageId: pageTargetId,
            archivo: 'captcha.png',
            base64: screenshotb64

        });

    }

});

app.post('/validaDocumento', async function(req, res) {

    let body = req.body;
    if (body.browserId === undefined || body.browserId === '') {
        res.status(400).json({
            error: 100,
            mensaje: 'browserId es requerido'
        })
    }

    if (body.pageId === undefined || body.pageId === '') {
        res.status(400).json({
            error: 100,
            mensaje: 'pageId es requerido'
        })
    }

    if (body.run === undefined || body.run === '') {
        res.status(400).json({
            error: 100,
            mensaje: 'run es requerido'
        })
    }

    if (body.tipo_documento === undefined || body.tipo_documento === '') {
        res.status(400).json({
            error: 100,
            mensaje: 'tipo_documento es requerido'
        })
    }

    if (body.numero_documento === undefined || body.numero_documento === '') {
        res.status(400).json({
            error: 100,
            mensaje: 'numero_documento es requerido'
        })
    }

    if (body.captcha_txt === undefined || body.captcha_txt === '') {
        res.status(400).json({
            error: 100,
            mensaje: 'captcha_txt es requerido'
        })
    }

    //consulta el browser por la targetid:body.browserId
    let target = null;

    try {
        target = await browser.waitForTarget(target => target._targetId === body.browserId, { timeout: 3000 });
    } catch (e) {
        res.status(400).json({
            error: 100,
            mensaje: 'timeout browser id es incorrecto, verifique'
        })
        return;
    }

    if (target === null) {
        res.status(400).json({
            error: 100,
            mensaje: 'browser id es incorrecto, verifique'
        })
    }

    browser = await target.browser();

    //obtiene el listado de paginas abiertas
    let pageList = await browser.pages();
    //consulta la pagina por el targetid:body.pageId
    let page = await pageList.find(pag => pag.target()._targetId === body.pageId);
    if (page === undefined) {
        res.status(400).json({
            error: 100,
            mensaje: 'Error: page id es incorrecto, verifique'
        })
    }

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
                res.status(200).json({ error: 0, mensaje });
            } else {
                //Si el popup existe, entonces error.
                console.log({ error: 100, mensaje });
                res.status(200).json({ error: 100, mensaje });
            }
        } else {
            console.log({ error: 100, mensaje: resp.error });
            res.status(500).json({ error: 100, mensaje: resp.error });
        }

        //await browser.close();
        page.close();

    }

});

app.listen(process.env.PORT, () => {
    console.log(`Escuchando puerto ${process.env.PORT}`)
})