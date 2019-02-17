import $ from 'jquery';
import consoleLog from 'console-log-html';
import * as socket from './socket';
import * as state from './state';

$(document).ready(() => {
    consoleLog.connect($('#console').get(0));

    let videoInput = $('#videoInput').get(0);
    let videoOutput = $('#videoOutput').get(0);

    $('#start').on('click', () => {
        socket.options.isOverlay = $('#isOverlay').prop('checked');
        socket.start(videoInput, videoOutput, () => {
            showSpinner(videoInput, videoOutput);
        });
    });
    $('#stop').on('click', socket.stop.bind(null, () => {
        hideSpinner(videoInput, videoOutput);
    }));
    state.set(state.I_CAN_START);
    socket.connect();
});

$(window).on('beforeunload', () => {
    socket.disconnect();
    consoleLog.disconnect();
});

$(document).delegate('*[data-toggle="lightbox"]', 'click', (event) => {
    event.preventDefault();
    $(event.target).ekkoLightbox();
});

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
