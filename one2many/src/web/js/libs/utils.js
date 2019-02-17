import $ from 'jquery';

export const Pages = Object.freeze({
    VIEWER: Symbol('viewer'),
    CAMERA: Symbol('camera'),
});

export function setUp(page) {
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
