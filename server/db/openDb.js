const sqlite3 = require('sqlite3').verbose();
const open = require('sqlite').open;
const path = require('path')
const fs = require('fs');
const dbPath = path.resolve(__dirname, 'browser.db');
fs.unlinkSync(dbPath);
//crea la base de datos.
const db = new sqlite3.Database(dbPath)

exports.openDB = async () => {
    try{
        return await open({
            filename: dbPath,
            mode: sqlite3.OPEN_READWRITE,
            driver: sqlite3.Database
        });
    } catch (error) {
        console.log(error);
    }
}
 
exports.createDB = async () => {
    //con this hacemos referencia a la funcion openDB en el mismo objeto.
    let db = await this.openDB();
    await db.exec(`
        CREATE TABLE IF NOT EXISTS "sockets" (
            "browserId"	TEXT NOT NULL,
            "pageId"	TEXT NOT NULL,
            "fechahora"	TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY("browserId")
        );
    `);
}



