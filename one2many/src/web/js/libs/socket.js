// global iceServers
import io from 'socket.io-client';
import * as kurentoUtils from 'kurento-utils';
import 'webrtc-adapter';
import state from './state';

let socket = null;
let webRtcPeer = null;

export function connect() {
    disconnect();
    socket = io();

    socket.on('error', (error) => {
        dispose();
        onError('Error message from server: ' + error);
    });

    socket.on('noAuth', () => {
        dispose();
        onError('Authentication failed');
    });

    socket.on('duplicateCameraId', (cameraId) => {
        dispose();
        onError(`this cameraId (${cameraId}) is duplicated`);
    });

    socket.on('noCameraId', (cameraId) => {
        dispose();
        onError(`this camera (${cameraId}) does not exist`);
    });

    socket.on('cameraDown', (cameraId) => {
        dispose();
        onError(`remote camera (${cameraId})is down`);
    });

    socket.on('startError', (error) => {
        dispose();
        onError('Error message from server: ' + error);
    });

    socket.on('startResponse', (sdpAnswer) => {
        startResponse(sdpAnswer);
    });

    socket.on('iceCandidate', (candidate) => {
        webRtcPeer.addIceCandidate(candidate);
    });
}

export function disconnect() {
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

    console.debug(`Invoking SDP offer callback function (${location.host}). offerSdp => ${offerSdp}`);
    socket.emit(target, offerSdp, cameraId);
}

function onIceCandidate(candidate) {
    console.debug(`Local candidate ${JSON.stringify(candidate)}`);
    socket.emit('onIceCandidate', candidate);
}

function startResponse(sdpAnswer) {
    state.set(state.I_CAN_STOP);
    console.debug(`SDP answer received from server. Processing ... sdpAnswer => ${sdpAnswer}`);
    webRtcPeer.processAnswer(sdpAnswer);
}

function onError(error) {
    console.error(error);
}

function dispose() {
    state.set(state.I_CAN_START);
    if (webRtcPeer) {
        webRtcPeer.dispose();
        webRtcPeer = null;
    }
}
