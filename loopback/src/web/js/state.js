import $ from 'jquery';

export const I_CAN_START = 0;
export const I_CAN_STOP = 1;
export const I_AM_STARTING = 2;

export let current = null;

export function set(nextState) {
    let $start = $('#start');
    let $stop = $('#stop');
    let $isOverlay = $('#isOverlay');
    switch (nextState) {
        case I_CAN_START:
            $start.attr('disabled', false);
            $stop.attr('disabled', true);
            $isOverlay.attr('disabled', false);
            break;

        case I_CAN_STOP:
            $start.attr('disabled', true);
            $stop.attr('disabled', false);
            $isOverlay.attr('disabled', true);
            break;

        case I_AM_STARTING:
            $start.attr('disabled', true);
            $stop.attr('disabled', true);
            $isOverlay.attr('disabled', true);
            break;

        default:
            console.error('Unknown state ' + nextState);
            return;
    }
    current = nextState;
}
