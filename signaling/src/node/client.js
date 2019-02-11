import SocketIO from 'socket.io';
import kurento from 'kurento-client';
import log4js from 'log4js';

const logger = log4js.getLogger('client');
logger.level = process.env.LOG_LEVEL || 'debug';

const ws_uri = process.env.KURENTO_URL || 'ws://localhost:8888/kurento';

export function register(server) {
    let io = SocketIO(server);
    io.on('connection', (socket) => {
        socket.on('error', () => {
            logger.info(`Connection ${socket.id} error`);
            stop(socket.id);
        });

        socket.on('close', () => {
            logger.info(`Connection ${socket.id} closed`);
            stop(socket.id);
        });

        socket.on('start', (sdpOffer) => {
            logger.info(`Connection ${socket.id} received 'start' sdpOffer => ${sdpOffer}`);
            start(socket.id, socket, sdpOffer)
                .then((sdpAnswer) => {
                    socket.emit('startResponse', sdpAnswer);
                })
                .catch((error) => {
                    socket.emit('error', error);
                });
        });

        socket.on('stop', () => {
            logger.info(`Connection ${socket.id} received 'stop'`);
            stop(socket.id);
        });

        socket.on('onIceCandidate', (candidate) => {
            logger.info(`Connection ${socket.id} received 'onIceCandidate', candidate => ${candidate}`);
            onIceCandidate(socket.id, candidate);
        });
    });
}

let sessions = {};
let candidatesQueue = {};

function start(sessionId, socket, sdpOffer) {
    return new Promise((resolve, reject) => {
        if (!sessionId) {
            reject('Cannot use undefined sessionId');
            return;
        }

        getKurentoClient()
            .then(createMediaPipeline)
            .then(createWebRtcEndpoint)
            .then(loopBack)
            .then(connectMediaStream)
            .then((sdpAnswer) => {
                resolve(sdpAnswer);
            })
            .catch((error) => {
                reject(error);
            });
    });

    function getKurentoClient() {
        let kurentoClient = null;
        return new Promise((resolve, reject) => {
            if (kurentoClient !== null) {
                resolve(kurentoClient);
                return;
            }

            kurento(ws_uri, (error, _kurentoClient) => {
                if (error) {
                    logger.error(`Could not find media server at address ws_uri`);
                    reject(`Could not find media server at address ${ws_uri}. Exiting with error ${error}`);
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

    function createWebRtcEndpoint(pipeline) {
        return new Promise((resolve, reject) => {
            pipeline.create('WebRtcEndpoint', (error, webRtcEndpoint) => {
                if (error) {
                    pipeline.release();
                    reject(error);
                    return;
                }

                if (candidatesQueue[sessionId]) {
                    while(candidatesQueue[sessionId].length) {
                        var candidate = candidatesQueue[sessionId].shift();
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

    function loopBack(resources) {
        return new Promise((resolve, reject) => {
            resources.webRtcEndpoint.connect(resources.webRtcEndpoint, (error) => {
                if (error) {
                    resources.pipeline.release();
                    reject(error);
                    return;
                }
                resolve(resources);
            });
        });
    }

    function connectMediaStream(resources) {
        return new Promise((resolve, reject) => {
            resources.webRtcEndpoint.on('OnIceCandidate', (event) => {
                var candidate = kurento.getComplexType('IceCandidate')(event.candidate);
                socket.emit('iceCandidate', candidate);
            });

            resources.webRtcEndpoint.processOffer(sdpOffer, (error, sdpAnswer) => {
                if (error) {
                    resources.pipeline.release();
                    reject(error);
                    return;
                }

                sessions[sessionId] = resources;

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
}

function stop(sessionId) {
    if (sessions[sessionId]) {
        var pipeline = sessions[sessionId].pipeline;
        logger.debug('Releasing pipeline');
        pipeline.release();

        delete sessions[sessionId];
        delete candidatesQueue[sessionId];
    }
}

function onIceCandidate(sessionId, _candidate) {
    var candidate = kurento.getComplexType('IceCandidate')(_candidate);

    if (sessions[sessionId]) {
        logger.debug('Sending candidate');
        var webRtcEndpoint = sessions[sessionId].webRtcEndpoint;
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
