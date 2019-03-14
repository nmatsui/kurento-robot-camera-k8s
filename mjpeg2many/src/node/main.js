import http from 'http';
import express from 'express';
import * as client from './libs/client';
import * as utils from './libs/utils';
import log4js from 'log4js';

const logger = log4js.getLogger('main');
logger.level = process.env.LOG_LEVEL || 'debug';

const app = express();
app.set("view engine", "ejs");
app.use('/static', express.static('static'));

const server = http.createServer(app);
client.register(server);

let iceServers = utils.getIceServers();
app.get("/", (req, res) => {
    res.render("./index.ejs", {
        iceServers: JSON.stringify(iceServers)
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    logger.info(`listen on port=${PORT}`);
});
