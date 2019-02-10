import http from 'http';
import express from 'express';
import SocketIO from 'socket.io';
import log4js from 'log4js';

const logger = log4js.getLogger('main');
logger.level = process.env.LOG_LEVEL || 'debug';

const app = express();
app.set("view engine", "ejs");
app.use('/static', express.static('static'));

const server = http.createServer(app);
const io = SocketIO(server);

app.get("/", (req, res) => {
    res.render("./index.ejs", {});
});

io.on('connection', (socket) => {
    logger.debug(`connected socket.id=${socket.id}`);

    socket.on('disconnect', () => {
        logger.debug(`disonected socket.id=${socket.id}`);
    });

    socket.on('message', (message) => {
        logger.debug(`message = ${message} from socket.id=${socket.id}`);
        socket.emit('message', `${message} world`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    logger.info(`listen on port=${PORT}`);
});
