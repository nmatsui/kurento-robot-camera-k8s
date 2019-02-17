import $ from 'jquery';
import 'bootstrap';
import * as utils from './utils';

$(document).ready(() => {
    $('#start').on('click', () => {
        console.log('start');
    });
    $('#stop').on('click', () => {
        console.log('stop');
    });

    utils.setUp('viewer');
    console.log('viewer start');
});
