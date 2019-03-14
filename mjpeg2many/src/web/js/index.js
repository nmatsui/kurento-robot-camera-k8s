import $ from 'jquery';
import 'bootstrap';
import * as utils from './libs/utils';
import * as socket from './libs/socket';

$(document).ready(() => {
    let remoteStream = $('#remoteStream').get(0);

    $('#start').on('click', () => {
        console.log('start button clicked');
        let passPhrase = utils.getVal('passPhrase');
        let mjpegStreamUri = utils.getVal('mjpegStreamUri');
        if (passPhrase && mjpegStreamUri) {
            socket.start(passPhrase, mjpegStreamUri, remoteStream);
        }
    });
    $('#stop').on('click', () => {
        console.log('stop button clicked');
        socket.stop();
    });

    utils.setUp();
    socket.connect('passPhrase', 'mjpegStreamUri', 'alertHolder');
    console.log('index page ready');
});

$(window).on('beforeunload', () => {
    socket.disconnect();
    utils.tearDown();
});
