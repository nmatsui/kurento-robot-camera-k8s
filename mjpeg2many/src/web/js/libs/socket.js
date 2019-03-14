// global iceServers
import io from 'socket.io-client';
import * as kurentoUtils from 'kurento-utils';
import 'webrtc-adapter';
import state from './state';
import * as utils from './utils';

let socket = null;
let webRtcPeer = null;

export function connect(authElem, mjpegStreamElem, alertElem) {
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

export function disconnect() {
    console.log('disconnect socket');
    dispose();
    if (socket) {
        socket.close();
    }
    socket = null;
}

export function start(passPhrase, mjpegStreamUri, remoteVideo) {
    console.log('Starting page ...');
    state.set(state.I_AM_STARTING);

    let constraints = {
        audio: false,
        video: {
            framerate: 15
        }
    };

    let options = {
        remoteVideo: remoteVideo,
        onicecandidate : onIceCandidate,
        mediaConstraints: constraints,
        configuration: {
            iceServers: iceServers ? iceServers : []
        }
    };

    socket.emit('authenticate', passPhrase, (result) => {
        if (result) {
            webRtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerRecvonly(options, (error) => {
                if(error) return onError(error);
                webRtcPeer.generateOffer((error, offerSdp) => {
                    onOffer(error, offerSdp, mjpegStreamUri);
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

function onOffer(error, offerSdp, mjpegStreamUri) {
    if(error) return console.log(error);

    console.log(`Invoking SDP offer callback function (${location.host}). offerSdp =>`);
    console.debug(offerSdp);
    socket.emit('start', offerSdp, mjpegStreamUri);
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
