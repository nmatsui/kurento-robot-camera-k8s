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

        socket.on('message', (_message) => {
            var message = JSON.parse(_message);
            logger.info(`Connection ${socket.id} received message ${message.id}`);

            switch (message.id) {
                case 'start':
                    start(socket.id, socket, message.sdpOffer, function(error, sdpAnswer) {
                        if (error) {
                            return socket.send(JSON.stringify({
                                id : 'error',
                                message : error
                            }));
                        }
                        socket.send(JSON.stringify({
                            id : 'startResponse',
                            sdpAnswer : sdpAnswer
                        }));
                    });
                    break;

                case 'stop':
                    stop(socket.id);
                    break;

                case 'onIceCandidate':
                    onIceCandidate(socket.id, message.candidate);
                    break;

                default:
                    socket.send(JSON.stringify({
                        id : 'error',
                        message : 'Invalid message ' + message
                    }));
                    break;
            }
        });
    });
}

let sessions = {};
let candidatesQueue = {};
let kurentoClient = null;

// Recover kurentoClient for the first time.
function getKurentoClient(callback) {
    if (kurentoClient !== null) {
        return callback(null, kurentoClient);
    }

    kurento(ws_uri, function(error, _kurentoClient) {
        if (error) {
            logger.error("Could not find media server at address " + ws_uri);
            return callback("Could not find media server at address" + ws_uri
                    + ". Exiting with error " + error);
        }

        kurentoClient = _kurentoClient;
        callback(null, kurentoClient);
    });
}

function start(sessionId, socket, sdpOffer, callback) {
    if (!sessionId) {
        return callback('Cannot use undefined sessionId');
    }

    getKurentoClient(function(error, kurentoClient) {
        if (error) {
            return callback(error);
        }

        kurentoClient.create('MediaPipeline', function(error, pipeline) {
            if (error) {
                return callback(error);
            }

            createMediaElements(pipeline, function(error, webRtcEndpoint) {
                if (error) {
                    pipeline.release();
                    return callback(error);
                }

                if (candidatesQueue[sessionId]) {
                    while(candidatesQueue[sessionId].length) {
                        var candidate = candidatesQueue[sessionId].shift();
                        webRtcEndpoint.addIceCandidate(candidate);
                    }
                }

                connectMediaElements(webRtcEndpoint, function(error) {
                    if (error) {
                        pipeline.release();
                        return callback(error);
                    }

                    webRtcEndpoint.on('OnIceCandidate', function(event) {
                        var candidate = kurento.getComplexType('IceCandidate')(event.candidate);
                        socket.send(JSON.stringify({
                            id : 'iceCandidate',
                            candidate : candidate
                        }));
                    });

                    webRtcEndpoint.processOffer(sdpOffer, function(error, sdpAnswer) {
                        if (error) {
                            pipeline.release();
                            return callback(error);
                        }

                        sessions[sessionId] = {
                            'pipeline' : pipeline,
                            'webRtcEndpoint' : webRtcEndpoint
                        }
                        return callback(null, sdpAnswer);
                    });

                    webRtcEndpoint.gatherCandidates(function(error) {
                        if (error) {
                            return callback(error);
                        }
                    });
                });
            });
        });
    });
}

function createMediaElements(pipeline, callback) {
    pipeline.create('WebRtcEndpoint', function(error, webRtcEndpoint) {
        if (error) {
            return callback(error);
        }

        return callback(null, webRtcEndpoint);
    });
}

function connectMediaElements(webRtcEndpoint, callback) {
    webRtcEndpoint.connect(webRtcEndpoint, function(error) {
        if (error) {
            return callback(error);
        }
        return callback(null);
    });
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
