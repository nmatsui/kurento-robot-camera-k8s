import $ from 'jquery';
import 'bootstrap';
import * as utils from './libs/utils';
import * as socket from './libs/socket';

$(document).ready(() => {
    let localStream = $('#localStream').get(0);

    $('#start').on('click', () => {
        console.log('start button clicked');
        let passPhrase = utils.getVal('passPhrase');
        let cameraId = utils.getVal('cameraId');
        if (passPhrase && cameraId) {
            socket.startCamera(passPhrase, cameraId, localStream);
        }
    });

    $('#stop').on('click', () => {
        console.log('stop button clicked');
        socket.stop();
    });

    utils.setUp(utils.Pages.CAMERA);
    socket.connect('passPhrase', 'cameraId', 'alertHolder');
    console.log('camera page ready');
});

$(window).on('beforeunload', () => {
    socket.disconnect();
    utils.tearDown();
});
