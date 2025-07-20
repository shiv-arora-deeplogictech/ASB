const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

exports.start = async function (routeName, aiappInfo, messageContainer, message) {
    try {
        let { sqlRequest } = message.content;
        sqlRequest = sqlRequest.trim().replace(/^"+|"+$/g, '').replace(/\\"/g, '"');
        LOG.info(`[SQLQUERYHANDLER] Executing SQL: ${sqlRequest}`);
        if (!sqlRequest || typeof sqlRequest !== "string") throw new Error("Missing or invalid SQL string in message.content.sql");

        // Locate .db file in CONSTANTS.ROOTDIR/db/
        const dbDir = path.join(CONSTANTS.ROOTDIR, "db");
        const dbFiles = fs.readdirSync(dbDir).filter(file => file.endsWith(".db"));

        if (dbFiles.length === 0) throw new Error(`No .db file found in ${dbDir}`);
        const dbPath = path.join(dbDir, dbFiles[0]);
        LOG.info(`[SQLQUERYHANDLER] Using database: ${dbPath}`);

        const db = new sqlite3.Database(dbPath);

        db.all(sqlRequest, [], (err, rows) => {
            if (err) {
                LOG.error(`[SQLQUERYHANDLER] SQL error: ${err.message}`);
                message.content.sql_res = { error: "SQL execution error", details: err.message };
                message.addRouteError(routeName);
            } else {
                LOG.info(`[SQLQUERYHANDLER] SQL query successful. Rows: ${rows.length}`);
                message.content.sql_res = rows;
                message.addRouteDone(routeName);
            }

            db.close();
            messageContainer.add(message);
        });

    } catch (err) {
        LOG.error(`[SQLQUERYHANDLER] Fatal error: ${err.message}`);
        message.content.sql_res = { error: err.message };
        message.addRouteError(routeName);
        messageContainer.add(message);
    }
};