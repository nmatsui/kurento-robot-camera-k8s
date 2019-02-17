import $ from 'jquery';
import 'bootstrap';
import * as utils from './libs/utils';

$(document).ready(() => {
    $('#start').on('click', () => {
        console.log('start');
    });
    $('#stop').on('click', () => {
        console.log('stop');
    });

    utils.setUp(utils.Pages.CAMERA);
    console.log('camera start');
});

