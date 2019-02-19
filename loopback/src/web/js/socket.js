// global iceServers
import io from 'socket.io-client';
import * as kurentoUtils from 'kurento-utils';
import 'webrtc-adapter';
import * as state from './state';

let socket = null;
let webRtcPeer = null;

export let options = {
    isOverlay :true
}

export function connect() {
    disconnect();
    socket = io();

    socket.on('startResponse', (sdpAnswer) => {
        startResponse(sdpAnswer);
    });

    socket.on('error', (error) => {
        if (state.current == state.I_AM_STARTING) {
            state.set(state.I_CAN_START);
        }
        onError('Error message from server: ' + error);
    });

    socket.on('iceCandidate', (candidate) => {
        webRtcPeer.addIceCandidate(candidate);
    });
}

export function disconnect() {
    if (socket) {
        socket.close();
    }
    socket = null;
}

export function start(videoInput, videoOutput, startCallback) {
    console.info('Starting video call ...')

    state.set(state.I_AM_STARTING);
    startCallback();

    console.info('Creating WebRtcPeer and generating local sdp offer ...');

    var options = {
        localVideo: videoInput,
        remoteVideo: videoOutput,
        onicecandidate : onIceCandidate,
        configuration: {
            iceServers: iceServers ? iceServers : []
        }
    }

    webRtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerSendrecv(options, (error) => {
        if(error) return onError(error);
        webRtcPeer.generateOffer(onOffer);
    });
}

export function stop(stopCallback) {
    console.info('Stopping video call ...');
    state.set(state.I_CAN_START);
    if (webRtcPeer) {
        webRtcPeer.dispose();
        webRtcPeer = null;

        socket.emit('stop');
    }
    stopCallback();
}

function onIceCandidate(candidate) {
    console.debug(`Local candidate ${JSON.stringify(candidate)}`);
    socket.emit('onIceCandidate', candidate);
}

function onOffer(error, offerSdp) {
    if(error) return onError(error);

    console.debug(`Invoking SDP offer callback function (${location.host}). offerSdp => ${offerSdp}`);
    socket.emit('start', offerSdp, options.isOverlay);
}

function onError(error) {
    console.error(error);
}

function startResponse(sdpAnswer) {
    state.set(state.I_CAN_STOP);
    console.debug(`SDP answer received from server. Processing ... sdpAnswer => ${sdpAnswer}`);
    webRtcPeer.processAnswer(sdpAnswer);
}
