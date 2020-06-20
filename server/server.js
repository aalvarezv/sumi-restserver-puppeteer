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
            return res.status(504).json({
                error: 100,
                mensaje: e.message
            });
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
        return res.status(400).json({
            error: 100,
            mensaje: 'browserId es requerido'
        });
    }

    if (body.pageId === undefined || body.pageId === '') {
        return res.status(400).json({
            error: 100,
            mensaje: 'pageId es requerido'
        });
    }

    if (body.run === undefined || body.run === '') {
        return res.status(400).json({
            error: 100,
            mensaje: 'run es requerido'
        });
    }

    if (body.tipo_documento === undefined || body.tipo_documento === '') {
        return res.status(400).json({
            error: 100,
            mensaje: 'tipo_documento es requerido'
        });
    }

    if (body.numero_documento === undefined || body.numero_documento === '') {
        return res.status(400).json({
            error: 100,
            mensaje: 'numero_documento es requerido'
        });
    }

    if (body.captcha_txt === undefined || body.captcha_txt === '') {
        return res.status(400).json({
            error: 100,
            mensaje: 'captcha_txt es requerido'
        });
    }

    //consulta el browser por la targetid:body.browserId
    let target = null;

    try {
        //verifica estado del browser levantado en la primera llamada.
        target = await browser.waitForTarget(target => target._targetId === body.browserId, { timeout: 3000 });

        browser = await target.browser();

    } catch (error) {
        return res.status(500).json({
            error: 100,
            mensaje: `Error: al revisar estado del browser, verifique ${error}`
        })
    }

    let page = null;
    try{
         //obtiene el listado de pestañas abiertas
         let pageList = await browser.pages();
         //consulta la pestaña por el targetid:body.pageId
         page = await pageList.find(pag => pag.target()._targetId === body.pageId);
         
         if (page === undefined) {
             return res.status(500).json({
                 error: 100,
                 mensaje: `Error: page id no existe en el listado de pestañas abiertas, verifique`
             })
         }
         
    }catch(error){
        return res.status(500).json({
            error: 100,
            mensaje: `Error: al revisar estado de pestaña del browser, verifique ${error}`
        })
    }

    //completa los campos
    try{

        await page.type("[name='form:run']", body.run);
        await page.select("[name='form:selectDocType']", body.tipo_documento);
        await page.type("[name='form:docNumber']", body.numero_documento);
        await page.type("[name='form:inputCaptcha']", body.captcha_txt);
        //hace el clic
        await page.evaluate(() => checkFields());

    }catch(error){
        page.close();
        return res.status(500).json({
            error: 100,
            mensaje: `Error: al completar el formulario para realizar la consulta ${error}`
        })
    }
    //revisamos si una vez que hizo clic se levantó un popup.
    let popupError = null;
    try{
        //obtiene el popup.
        popupError = await page.waitForSelector("[id='confirmError']", {
            timeout: 3000,
        });
    }catch(error){
        //el popup no existe.
        popupError = null
    }

    let selector = null;
    //si no hay un popup
    if (popupError === null) {
        //Selecciona el elemento que contiene el estado del documento.
        selector = "[class='setWidthOfSecondColumn']";
    }else{
        //Selecciona el elemento que contiene el mensaje de alerta del sitio.
        selector = "[id='confirmError'] [class='generalText']";
    }

    //Selecciona el elemento según lo que contenga la variable selector.
    //1. El elemento que contiene el estado de la cedula.
    //2. El elemento (popup) con el mensaje del sitio.
    let selector_respuesta = null;
    try{
        
        selector_respuesta = await page.waitForSelector(selector, {
            timeout: 3000
        });

    }catch(error){
        page.close();
      
        if(popupError){
            return res.status(500).json({
                error: 100,
                mensaje: `Error: al seleccionar elemento que contiene mensaje de alerta del sitio, intente nuevamente`
            })

        }else{
            return res.status(500).json({
                error: 100,
                mensaje: `Error: al seleccionar elemento que contiene estado de la cedula, intente nuevamente`
            })
        }
    }

    //Si existe el selector
    if(selector_respuesta){

        try{

            let mensaje = await selector_respuesta.getProperty('textContent');
            mensaje = await mensaje.jsonValue();

            //Si hay un mensaje y no hay un popup de alerta del sitio.
            //entonces capturamos el estado de la cedula!!!
            if(mensaje && !popupError){
                res.status(200).json({ error: 0, mensaje });

            //Hay popup con mensaje del sitio.
            }else if(mensaje && popupError){
                res.status(200).json({ error: 100, mensaje });

            //Se produjo algo inesperado.
            }else{
                res.status(400).json({ 
                    error: 100, 
                    mensaje: `No se pudo leer la respuesta del sitio, verifique que la información enviada sea correcta e intente nuevamente. Datos recibidos: RUN ${body.run}, Número Documento ${body.numero_documento}y Tipo Documento ${body.tipo_documento}.`
                });
            }
            //await browser.close();
            page.close();

        }catch(error){
            page.close();
            //hay popup.
            if(popupError){
                return res.status(500).json({
                    error: 100,
                    mensaje: `Error: al leer mensaje de alerta del sitio, intente nuevamente`
                })
            //no hay popup, entonces el error se produjo al leer el estado de la cedula.
            }else{
                return res.status(500).json({
                    error: 100,
                    mensaje: `Error: al leer estado de la cedula, intente nuevamente`
                })
            }
        }
    }

});

app.listen(process.env.PORT, () => {
    console.log(`Escuchando puerto ${process.env.PORT}`)
})