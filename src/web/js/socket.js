import io from 'socket.io-client';
import * as kurentoUtils from 'kurento-utils';
import 'webrtc-adapter';
import * as state from './state';

let socket = null;
let webRtcPeer = null;

export function connect() {
    disconnect();
    socket = io();
    socket.on('message', (message) => {
        var parsedMessage = JSON.parse(message);
        console.log('Received message: ' + message);

        switch (parsedMessage.id) {
            case 'startResponse':
                startResponse(parsedMessage);
                break;
            case 'error':
                if (state.current == state.I_AM_STARTING) {
                    state.set(state.I_CAN_START);
                }
                onError('Error message from server: ' + parsedMessage.message);
                break;
            case 'iceCandidate':
                webRtcPeer.addIceCandidate(parsedMessage.candidate)
                break;
            default:
                if (state.current == state.I_AM_STARTING) {
                    state.set(state.I_CAN_START);
                }
                onError('Unrecognized message', parsedMessage);
        }
    });
}

export function disconnect() {
    if (socket) {
        socket.close();
    }
    socket = null;
}

export function start(videoInput, videoOutput, startCallback) {
    console.log('Starting video call ...')

    // Disable start button
    state.set(state.I_AM_STARTING);
    startCallback();

    console.log('Creating WebRtcPeer and generating local sdp offer ...');

    var options = {
        localVideo: videoInput,
        remoteVideo: videoOutput,
        onicecandidate : onIceCandidate,
        configuration: {
            iceServers: []
        }
    }

    webRtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerSendrecv(options, (error) => {
        if(error) return onError(error);
        webRtcPeer.generateOffer(onOffer);
    });
}

export function stop(stopCallback) {
    console.log('Stopping video call ...');
    state.set(state.I_CAN_START);
    if (webRtcPeer) {
        webRtcPeer.dispose();
        webRtcPeer = null;

        var message = {
            id : 'stop'
        }
        sendMessage(message);
    }
    stopCallback();
}

function onIceCandidate(candidate) {
    console.log('Local candidate' + JSON.stringify(candidate));

    var message = {
        id : 'onIceCandidate',
        candidate : candidate
    };
    sendMessage(message);
}

function onOffer(error, offerSdp) {
    if(error) return onError(error);

    console.info('Invoking SDP offer callback function ' + location.host);
    var message = {
        id : 'start',
        sdpOffer : offerSdp
    }
    sendMessage(message);
}

function onError(error) {
    console.error(error);
}

function startResponse(message) {
    state.set(state.I_CAN_STOP);
    console.log('SDP answer received from server. Processing ...');
    webRtcPeer.processAnswer(message.sdpAnswer);
}

function sendMessage(message) {
    var jsonMessage = JSON.stringify(message);
    console.log('Senging message: ' + jsonMessage);
    socket.send(jsonMessage);
}
