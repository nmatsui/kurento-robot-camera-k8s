import $ from 'jquery';

export function setUp(page) {
    switch (page) {
        case 'viewer':
            $('#navViewer').addClass('active');
            $('#navCamera').removeClass('active');
            break;
        case 'camera':
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
