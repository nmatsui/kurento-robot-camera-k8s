import $ from 'jquery';
import 'bootstrap';
import * as utils from './libs/utils';
import * as socket from './libs/socket';

$(document).ready(() => {
    let remoteStream = $('#remoteStream').get(0);

    $('#start').on('click', () => {
        console.log('start button clicked');
        let passPhrase = utils.getVal('passPhrase');
        let cameraId = utils.getVal('cameraId');
        if (passPhrase && cameraId) {
            socket.startViewer(passPhrase, cameraId, remoteStream);
        }
    });
    $('#stop').on('click', () => {
        console.log('stop button clicked');
        socket.stop();
    });

    utils.setUp(utils.Pages.VIEWER);
    socket.connect('passPhrase', 'cameraId', 'alertHolder');
    console.log('viewer page ready');
});

$(window).on('beforeunload', () => {
    socket.disconnect();
    utils.tearDown();
});
