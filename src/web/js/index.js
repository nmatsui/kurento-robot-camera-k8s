import io from 'socket.io-client';
import $ from 'jquery';
import consoleLog from 'console-log-html';
import * as kurentoUtils from 'kurento-utils';
import 'webrtc-adapter';

let socket = io();

var videoInput;
var videoOutput;
var webRtcPeer;
var state = null;

const I_CAN_START = 0;
const I_CAN_STOP = 1;
const I_AM_STARTING = 2;

window.onload = () => {
    consoleLog.connect(document.getElementById("console"));

    console.log('Page loaded ...');
    videoInput = document.getElementById('videoInput');
    videoOutput = document.getElementById('videoOutput');
    setState(I_CAN_START);
    document.getElementById('start').onclick = start;
    document.getElementById('stop').onclick = stop;
}

window.onbeforeunload = function() {
    socket.close();
    consoleLog.disconnect();
}

socket.on('message', function(message) {
    var parsedMessage = JSON.parse(message);
    console.log('Received message: ' + message);

    switch (parsedMessage.id) {
        case 'startResponse':
            startResponse(parsedMessage);
            break;
        case 'error':
            if (state == I_AM_STARTING) {
                setState(I_CAN_START);
            }
            onError('Error message from server: ' + parsedMessage.message);
            break;
        case 'iceCandidate':
            webRtcPeer.addIceCandidate(parsedMessage.candidate)
            break;
        default:
            if (state == I_AM_STARTING) {
                setState(I_CAN_START);
            }
            onError('Unrecognized message', parsedMessage);
    }
});

function start() {
    console.log('Starting video call ...')

    // Disable start button
    setState(I_AM_STARTING);
    showSpinner(videoInput, videoOutput);

    console.log('Creating WebRtcPeer and generating local sdp offer ...');

    var options = {
        localVideo: videoInput,
        remoteVideo: videoOutput,
        onicecandidate : onIceCandidate,
        configuration: {
            iceServers: []
        }
    }

    webRtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerSendrecv(options, function(error) {
        if(error) return onError(error);
        this.generateOffer(onOffer);
    });
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
    setState(I_CAN_STOP);
    console.log('SDP answer received from server. Processing ...');
    webRtcPeer.processAnswer(message.sdpAnswer);
}

function stop() {
    console.log('Stopping video call ...');
    setState(I_CAN_START);
    if (webRtcPeer) {
        webRtcPeer.dispose();
        webRtcPeer = null;

        var message = {
            id : 'stop'
        }
        sendMessage(message);
    }
    hideSpinner(videoInput, videoOutput);
}

function setState(nextState) {
    switch (nextState) {
        case I_CAN_START:
            $('#start').attr('disabled', false);
            $('#stop').attr('disabled', true);
            break;

        case I_CAN_STOP:
            $('#start').attr('disabled', true);
            $('#stop').attr('disabled', false);
            break;

        case I_AM_STARTING:
            $('#start').attr('disabled', true);
            $('#stop').attr('disabled', true);
            break;

        default:
            onError('Unknown state ' + nextState);
            return;
    }
    state = nextState;
}

function sendMessage(message) {
    var jsonMessage = JSON.stringify(message);
    console.log('Senging message: ' + jsonMessage);
    socket.emit('message', jsonMessage);
}

function showSpinner() {
    for (var i = 0; i < arguments.length; i++) {
        arguments[i].poster = './static/img/transparent-1px.png';
        arguments[i].style.background = 'center transparent url("./static/img/spinner.gif") no-repeat';
    }
}

function hideSpinner() {
    for (var i = 0; i < arguments.length; i++) {
        arguments[i].src = '';
        arguments[i].poster = './static/img/webrtc.png';
        arguments[i].style.background = '';
    }
}

$(document).delegate('*[data-toggle="lightbox"]', 'click', function(event) {
    event.preventDefault();
    $(this).ekkoLightbox();
});
