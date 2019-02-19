import $ from 'jquery';

let current = null;
let elem = {
    __start: null,
    __stop: null,
    __video: null,
    get start() {
        if (!this.__start) this.__start = $('#start');
        return this.__start;
    },
    get stop() {
        if (!this.__stop) this.__stop = $('#stop');
        return this.__stop;
    },
    get video() {
        if (!this.__video) this.__video = $('video.kurentoStream').get(0);
        return this.__video;
    },
}

function showSpinner() {
    elem.video.poster = '/static/img/transparent-1px.png';
    elem.video.style.background = 'center transparent url("/static/img/spinner.gif") no-repeat';
}

function hideSpinner() {
    elem.video.src = '';
    elem.video.poster = '/static/img/webrtc.png';
    elem.video.style.background = '';
}

class State {
    constructor() {
        this.I_CAN_START = Symbol('canStart');
        this.I_CAN_STOP = Symbol('canStop');
        this.I_AM_STARTING = Symbol('starting');
    }

    get current() {
        return current;
    }

    set(nextState) {
        switch(nextState) {
            case this.I_CAN_START:
                elem.start.attr('disabled', false);
                elem.stop.attr('disabled', true);
                hideSpinner();
                break;
            case this.I_CAN_STOP:
                elem.start.attr('disabled', true);
                elem.stop.attr('disabled', false);
                break;
            case this.I_AM_STARTING:
                elem.start.attr('disabled', true);
                elem.stop.attr('disabled', true);
                showSpinner();
                break;
            default:
                break;
        }
        current = nextState;
    }
}

export default new State();
