import $ from 'jquery';
import consoleLog from 'console-log-html';

export const Pages = Object.freeze({
    VIEWER: Symbol('viewer'),
    CAMERA: Symbol('camera'),
});

export function setUp(page) {
    consoleLog.connect($('#console').get(0));
    switch (page) {
        case Pages.VIEWER:
            $('#navViewer').addClass('active');
            $('#navCamera').removeClass('active');
            break;
        case Pages.CAMERA:
            $('#navViewer').removeClass('active');
            $('#navCamera').addClass('active');
            break;
        default:
            $('#navViewer').removeClass('active');
            $('#navCamera').removeClass('active');
            break;
    }

    // for macOS Chrome
    $('nav.navbar a.navbar-brand').on('click', (event) => {
        event.target.blur();
    });
}

export function tearDown() {
    consoleLog.disconnect();
}
