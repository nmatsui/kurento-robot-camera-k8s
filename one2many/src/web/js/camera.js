import $ from 'jquery';
import 'bootstrap';
import * as utils from './utils';

$(document).ready(() => {
    $('#start').on('click', (event) => {
        console.log('start');
    });
    $('#stop').on('click', (event) => {
        console.log('stop');
    });

    utils.setUp('camera');
    console.log('camera start');
});

