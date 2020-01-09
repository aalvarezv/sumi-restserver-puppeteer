'use strict'

const puppeteer = require('puppeteer-core');
const { getExecutablePath } = require('./server/util/utils');

(async function run() {
    const executablePath = await getExecutablePath({});
    await lauchpuppeteer({ executablePath });
})();

const lauchpuppeteer = async launchOptions => {
    const browser = await puppeteer.launch({
        defaultViewport: null,
        headless: false,
        args: [
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--no-sandbox'
        ],
        ...launchOptions
    });

    const [page] = await browser.pages();
    await page.goto('https://portal.sidiv.registrocivil.cl/usuarios-portal/pages/DocumentRequestStatus.xhtml');
    await page.type("[id='form:run']", 'hola mundo');
}