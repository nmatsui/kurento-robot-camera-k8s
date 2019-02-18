// global iceServers
import io from 'socket.io-client';
import * as kurentoUtils from 'kurento-utils';
import 'webrtc-adapter';
import state from './state';
import * as utils from './utils';

let socket = null;
let webRtcPeer = null;

export function connect(authElem, cameraElem, alertElem) {
    console.log('connect socket');
    socket = io();

    socket.on('error', (error) => {
        dispose();
        let errmsg = `failed when starting Kurento; ${JSON.stringify(error)}`;
        onError(errmsg);
        utils.setAlert(alertElem, 'danger', 'Kurento Error', errmsg);
    });

    socket.on('noAuth', () => {
        dispose();
        let errmsg = 'authentication failed. passPhrase mismatch.';
        onError(errmsg);
        utils.setInvalidFeedback(authElem, errmsg);
    });

    socket.on('duplicateCameraId', (cameraId) => {
        dispose();
        let errmsg = `this cameraId (${cameraId}) has already been used.`;
        onError(errmsg);
        utils.setInvalidFeedback(cameraElem, errmsg);
    });

    socket.on('noCameraId', (cameraId) => {
        dispose();
        let errmsg = `this camera (${cameraId}) does not exist.`;
        onError(errmsg);
        utils.setInvalidFeedback(cameraElem, errmsg);
    });

    socket.on('cameraDown', (cameraId) => {
        dispose();
        let errmsg = `remote camera (${cameraId}) went down`;
        onError(errmsg);
        utils.setAlert(alertElem, 'warning', 'Camera Down', errmsg);
        disconnect();
        socket = io();
    });

    socket.on('startError', (error) => {
        dispose();
        let errmsg = `failed when starting Kurento; ${JSON.stringify(error)}`;
        onError(errmsg);
        utils.setAlert(alertElem, 'danger', 'Kurento Error', errmsg);
    });

    socket.on('startResponse', (sdpAnswer) => {
        startResponse(sdpAnswer);
    });

    socket.on('iceCandidate', (candidate) => {
        webRtcPeer.addIceCandidate(candidate);
    });
}

export function reconnect() {
    disconnect();
    console.log('reconnect socket');
    socket = io();
}

export function disconnect() {
    console.log('disconnect socket');
    dispose();
    if (socket) {
        socket.close();
    }
    socket = null;
}

export function start(passPhrase, cameraId, localVideo, remoteVideo) {
    console.log('Starting video call ...');
    state.set(state.I_AM_STARTING);

    socket.emit('authenticate', passPhrase, (result) => {
        if (result) {
            console.log('authenticate success');
            let options = {
                onicecandidate : onIceCandidate,
                configuration: {
                    iceServers: iceServers ? iceServers : []
                }
            }
            let target = '';

            if (localVideo && !remoteVideo) {
                options.localVideo = localVideo;
                target = 'camera';
            } else if (!localVideo && remoteVideo) {
                options.remoteVideo = remoteVideo;
                target = 'viewer';
            } else {
                throw new Error('video setting error');
            }

            webRtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerSendrecv(options, (error) => {
                if(error) return onError(error);
                webRtcPeer.generateOffer((error, offerSdp) => {
                    onOffer(error, offerSdp, target, cameraId);
                });
            });
        }
    });
}

export function stop() {
    console.info('Stopping video call ...');
    socket.emit('stop');
    dispose();
}

function onOffer(error, offerSdp, target, cameraId) {
    if(error) return console.log(error);

    console.log(`Invoking SDP offer callback function (${location.host}). offerSdp =>`);
    console.debug(offerSdp);
    socket.emit(target, offerSdp, cameraId);
}

function onIceCandidate(candidate) {
    console.log(`Local candidate =>`);
    console.debug(JSON.stringify(candidate));
    socket.emit('onIceCandidate', candidate);
}

function startResponse(sdpAnswer) {
    state.set(state.I_CAN_STOP);
    console.log('SDP answer received from server. Processing ... sdpAnswer =>');
    console.debug(JSON.stringify(sdpAnswer));
    webRtcPeer.processAnswer(sdpAnswer);
}

function onError(error) {
    console.error(error);
}

function dispose() {
    state.set(state.I_CAN_START);
    if (webRtcPeer) {
        webRtcPeer.dispose();
    }
    webRtcPeer = null;
}
