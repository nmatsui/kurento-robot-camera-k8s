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
let cameras = {};

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

        socket.on('camera', (sdpOffer, cameraId) => {
            logger.info(`start 'camera' ${socket.id}: cameraId => ${cameraId}, sdpOffer => ${sdpOffer}`);
            if (!isAuthenticate(socket)) return;
            if (cameraId in cameras) {
                socket.emit('duplicateCameraId', cameraId);
                return;
            }
            authedClients[socket.id].cameraId = cameraId;
            authedClients[socket.id].isCamera = true;

            startCamera(socket, sdpOffer, cameraId)
                .then((sdpAnswer) => {
                    socket.emit('startResponse', sdpAnswer);
                })
                .catch((error) => {
                    socket.emit('startError', error);
                    stop(socket.id);
                });
        });

        socket.on('viewer', (sdpOffer, cameraId) => {
            logger.info(`start 'viewer' ${socket.id}: cameraId => ${cameraId}, sdpOffer => ${sdpOffer}`);
            if (!isAuthenticate(socket)) return;
            if (!(cameraId in cameras)) {
                socket.emit('noCameraId', cameraId);
                return;
            }
            authedClients[socket.id].cameraId = cameraId;
            authedClients[socket.id].isCamera = false;

            startViewer(socket, sdpOffer, cameraId)
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

function startCamera(socket, sdpOffer, cameraId) {
    logger.debug(`startCamera sessionId=${socket.id} cameraId=${cameraId}`);
    return new Promise((resolve, reject) => {
        clearCandidatesQueue(socket.id);

        cameras[cameraId] = {
            cameraSessionId: socket.id,
            viewers: {},
        };

        getKurentoClient()
            .then((kurentoClient) => createMediaPipeline(kurentoClient, cameraId))
            .then((pipeline) => createWebRtcEndpoint(pipeline, socket.id, cameraId))
            .then((resources) => processOffer(resources, socket, sdpOffer, cameraId))
            .then((sdpAnswer) => {
                resolve(sdpAnswer);
            })
            .catch((error) => {
                reject(error);
            });
    });
}

function startViewer(socket, sdpOffer, cameraId) {
    logger.debug(`startViewer sessionId=${socket.id} cameraId=${cameraId}`);
    return new Promise((resolve, reject) => {
        if (!isCameraExistence(cameraId, reject)) return;
        if (!cameras[cameraId].cameraSessionId || !sessions[cameras[cameraId].cameraSessionId]) {
            reject('the mediaPipeline of camera does not exist. check cameraId and retry later.');
            return;
        }

        clearCandidatesQueue(socket.id);
        let pipeline = sessions[cameras[cameraId].cameraSessionId].pipeline;

        createWebRtcEndpoint(pipeline, socket.id, cameraId)
            .then((resources) => {
                return new Promise((resolve, reject) => {
                    if (!isCameraExistence(cameraId, reject)) return;

                    let cameraSessionId = cameras[cameraId].cameraSessionId;
                    cameras[cameraId].viewers[socket.id] = {
                        socket: socket,
                    };
                    sessions[cameraSessionId].webRtcEndpoint.connect(resources.webRtcEndpoint, (error) => {
                        if (!isCameraExistence(cameraId, reject)) return;
                        if (error) {
                            reject(error);
                            return;
                        }
                        resolve(resources);
                    });
                });
            })
            .then((resources) => processOffer(resources, socket, sdpOffer, cameraId))
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
    if (sessionId in authedClients) {
        let cameraId = authedClients[sessionId].cameraId;
        if (cameras[cameraId]) {
            if (authedClients[sessionId].isCamera) {
                for (let viewerId in cameras[cameraId].viewers) {
                    let viewerSocket = cameras[cameraId].viewers[viewerId].socket;
                    if(viewerSocket) {
                        logger.debug(`send 'camera ${cameraId} down' to ${viewerId}`);
                        viewerSocket.emit('cameraDown', cameraId);
                    }
                }
                logger.debug(`release camera ${cameraId} pipeline`);
                sessions[sessionId].pipeline.release();
                delete cameras[cameraId];
            } else {
                if (cameras[cameraId].viewers[sessionId]) {
                    logger.debug(`release webRtcEndpoint of camera ${cameraId}'s viewer ${sessionId}`);
                    sessions[sessionId].webRtcEndpoint.release();
                    delete cameras[cameraId].viewers[sessionId];
                }
            }
        }
    }

    if (sessions[sessionId]) {
        delete sessions[sessionId];
        delete candidatesQueue[sessionId];
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

function createMediaPipeline(kurentoClient, cameraId) {
    return new Promise((resolve, reject) => {
        if (!isCameraExistence(cameraId, reject)) return;

        kurentoClient.create('MediaPipeline', (error, pipeline) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(pipeline);
        });
    });
}

function createWebRtcEndpoint(pipeline, sessionId, cameraId) {
    return new Promise((resolve, reject) => {
        if (!isCameraExistence(cameraId, reject)) return;

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

function processOffer(resources, socket, sdpOffer, cameraId) {
    return new Promise((resolve, reject) => {
        if (!isCameraExistence(cameraId, reject)) return;

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
            if (!isCameraExistence(cameraId, reject)) return;

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

function isCameraExistence(cameraId, reject) {
    if (!(cameraId in cameras)) {
        reject(`this camera ${cameraId} has been removed. check cameraId and retry later.`);
        return false;
    }
    return true;
}
