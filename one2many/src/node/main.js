import http from 'http';
import express from 'express';
import ejsLayouts from 'express-ejs-layouts';
import log4js from 'log4js';

const logger = log4js.getLogger('main');
logger.level = process.env.LOG_LEVEL || 'debug';

const app = express();
app.set("view engine", "ejs");
app.use(ejsLayouts);
app.use('/static', express.static('static'));

const server = http.createServer(app);

let iceServers = [];
app.get("/", (req, res) => {
    res.redirect('/viewer');
});
app.get("/camera", (req, res) => {
    res.render("./camera.ejs", {
        iceServers: JSON.stringify(iceServers)
    });
});
app.get("/viewer", (req, res) => {
    res.render("./viewer.ejs", {
        iceServers: JSON.stringify(iceServers)
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    logger.info(`listen on port=${PORT}`);
});
