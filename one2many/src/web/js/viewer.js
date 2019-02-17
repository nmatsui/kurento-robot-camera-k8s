import $ from 'jquery';
import 'bootstrap';
import * as utils from './libs/utils';
import state from './libs/state';

$(document).ready(() => {
    $('#start').on('click', () => {
        console.log('start');
        state.set(state.I_AM_STARTING);
        setTimeout(() => {
            state.set(state.I_CAN_STOP);
        }, 3000);
    });
    $('#stop').on('click', () => {
        console.log('stop');
        state.set(state.I_CAN_START);
    });

    utils.setUp(utils.Pages.VIEWER);
    console.log('viewer start');
});
