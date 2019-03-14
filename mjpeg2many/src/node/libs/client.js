import SocketIO from 'socket.io';
import kurento from 'kurento-client';
import log4js from 'log4js';

const logger = log4js.getLogger('client');
logger.level = process.env.LOG_LEVEL || 'debug';

const passPhrase = process.env.PASS_PHRASE || '';
const wsUri = process.env.KURENTO_URL || 'ws://localhost:8888/kurento';

logger.debug(`KURENTO_URL=${wsUri}`);

if (!passPhrase || passPhrase.length == 0) {
    throw new Error('PASS_PHRASE is undefined');
}
logger.debug(`PASS_PHRASE=${passPhrase}`);

let authedClients = {};

export function register(server) {
    let io = SocketIO(server);
    io.on('connection', (socket) => {
        logger.debug(`connected from ${socket.id}`);
        socket.on('error', () => {
            logger.info(`Connection ${socket.id} error`);
            stop(socket.id);
        });

        socket.on('disconnect', () => {
            logger.debug(`disconnected from ${socket.id}`);
            stop(socket.id);
        });

        socket.on('authenticate', (clientPhrase, callback) => {
            logger.debug('authenticate client', passPhrase, clientPhrase);
            if (passPhrase === clientPhrase) {
                authedClients[socket.id] = {
                    sessionId: socket.id,
                };
                callback(true);
            } else {
                socket.emit('noAuth');
                callback(false);
            }
        });

        socket.on('start', (sdpOffer, mjpegStreamUri) => {
            logger.info(`received start message ${socket.id}: sdpOffer => ${sdpOffer}`);
            if (!isAuthenticate(socket)) return;
            start(socket, sdpOffer, mjpegStreamUri)
                .then((sdpAnswer) => {
                    socket.emit('startResponse', sdpAnswer);
                })
                .catch((error) => {
                    socket.emit('startError', error);
                    stop(socket.id);
                });
        });

        socket.on('stop', () => {
            logger.info(`Connection ${socket.id} received 'stop'`);
            if (!isAuthenticate(socket)) return;
            stop(socket.id);
        });

        socket.on('onIceCandidate', (candidate) => {
            logger.info(`Connection ${socket.id} received 'onIceCandidate', candidate => ${candidate}`);
            if (!isAuthenticate(socket)) return;
            onIceCandidate(socket.id, candidate);
        });
    });
}

let sessions = {};
let candidatesQueue = {};

function start(socket, sdpOffer, mjpegStreamUri) {
    logger.debug(`start sessionId=${socket.id} mjpegStreamUri=${mjpegStreamUri}`);
    return new Promise((resolve, reject) => {
        clearCandidatesQueue(socket.id);

        getKurentoClient()
            .then(createMediaPipeline)
            .then((pipeline) => createWebRtcEndpoint(pipeline, socket.id))
            .then((resources) => connectMediaStream(resources, mjpegStreamUri))
            .then((resources) => processOffer(resources, socket, sdpOffer))
            .then((sdpAnswer) => {
                resolve(sdpAnswer);
            })
            .catch((error) => {
                reject(error);
            });
    });
}

function stop(sessionId) {
    logger.debug(`stop sessionId=${sessionId}`);
    if (sessions[sessionId]) {
        let pipeline = sessions[sessionId].pipeline;
        logger.debug('Releasing pipeline');
        pipeline.release();

        delete sessions[sessionId];
        delete candidatesQueue[sessionId];
    }

    if (authedClients[sessionId]) {
        delete authedClients[sessionId];
    }
}

function onIceCandidate(sessionId, _candidate) {
    logger.debug(`onIceCandidate sessionId=${sessionId}`);
    var candidate = kurento.getComplexType('IceCandidate')(_candidate);

    if (sessions[sessionId]) {
        logger.debug('Sending candidate');
        let webRtcEndpoint = sessions[sessionId].webRtcEndpoint;
        webRtcEndpoint.addIceCandidate(candidate);
    }
    else {
        logger.debug('Queueing candidate');
        if (!candidatesQueue[sessionId]) {
            candidatesQueue[sessionId] = [];
        }
        candidatesQueue[sessionId].push(candidate);
    }
}

function getKurentoClient() {
    let kurentoClient = null;
    return new Promise((resolve, reject) => {
        if (kurentoClient != null) {
            resolve(kurentoClient);
            return;
        }

        kurento(wsUri, (error, _kurentoClient) => {
            if (error) {
                logger.error(`Could not find media server at address ${wsUri}`);
                reject(`Could not find media server at address ${wsUri}. Exiting with error ${error}`);
                return;
            }

            kurentoClient = _kurentoClient;
            resolve(kurentoClient);
        });
    });
}

function createMediaPipeline(kurentoClient) {
    return new Promise((resolve, reject) => {
        kurentoClient.create('MediaPipeline', (error, pipeline) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(pipeline);
        });
    });
}

function createWebRtcEndpoint(pipeline, sessionId) {
    return new Promise((resolve, reject) => {
        pipeline.create('WebRtcEndpoint', (error, webRtcEndpoint) => {
            if (error) {
                pipeline.release();
                reject(error);
                return;
            }

            if (candidatesQueue[sessionId]) {
                while(candidatesQueue[sessionId].length) {
                    let candidate = candidatesQueue[sessionId].shift();
                    webRtcEndpoint.addIceCandidate(candidate);
                }
            }

            resolve({
                'pipeline' : pipeline,
                'webRtcEndpoint' : webRtcEndpoint,
            });
        });
    });
}

function connectMediaStream(resources, mjpegStreamUri) {
    return new Promise((resolve, reject) => {
        resources.pipeline.create("PlayerEndpoint", {uri: mjpegStreamUri}, (error, playerEndpoint) => {
            if (error) {
                resources.pipeline.release();
                reject(error);
                return;
            }

            playerEndpoint.connect(resources.webRtcEndpoint, (error) => {
                if (error) {
                    resources.pipeline.release();
                    reject(error);
                    return;
                }
                playerEndpoint.play((error) => {
                    if (error) {
                        resources.pipeline.release();
                        reject(error);
                        return;
                    }
                    resolve(resources);
                });
            });
        });
    });
}

function processOffer(resources, socket, sdpOffer) {
    return new Promise((resolve, reject) => {
        resources.webRtcEndpoint.on('OnIceCandidate', (event) => {
            let candidate = kurento.getComplexType('IceCandidate')(event.candidate);
            socket.emit('iceCandidate', candidate);
        });

        resources.webRtcEndpoint.processOffer(sdpOffer, (error, sdpAnswer) => {
            if (error) {
                resources.pipeline.release();
                reject(error);
                return;
            }

            sessions[socket.id] = resources;

            resources.webRtcEndpoint.gatherCandidates((error) => {
                if (error) {
                    resources.pipeline.release();
                    reject(error);
                    return;
                }
                resolve(sdpAnswer);
            });
        });
    });
}

function clearCandidatesQueue(sessionId) {
    if (candidatesQueue[sessionId]) {
        delete candidatesQueue[sessionId];
    }
}

function isAuthenticate(socket) {
    if (!(socket.id in authedClients)) {
        socket.emit('noAuth');
        return false;
    }
    return true;
}
