import $ from 'jquery';
import consoleLog from 'console-log-html';

export function setUp() {
    consoleLog.connect($('#console').get(0));

    // for macOS Chrome
    $('nav.navbar a.navbar-brand').on('click', (event) => {
        event.target.blur();
    });
}

export function tearDown() {
    consoleLog.disconnect();
}

function getElem(id) {
    let cache = {};
    if (!(id in cache)) {
        cache[id] = $(`#${id}`);
    }
    return cache[id];
}

export function getVal(id) {
    let val = getElem(id).val();
    if (!val || val.length == 0) {
        let errmsg = `${id} is required`;
        console.error(errmsg);
        setInvalidFeedback(id, errmsg);
        return null;
    }
    setValidFeedback(id);
    return val;
}

export function setInvalidFeedback(id, text) {
    getElem(id).addClass('is-invalid');
    getElem(id).removeClass('is-valid');
    getElem(`${id}Msg`).addClass('invalid-feedback');
    getElem(`${id}Msg`).text(text);
}

export function setValidFeedback(id, text) {
    getElem(id).removeClass('is-invalid');
    getElem(id).addClass('is-valid');
    getElem(`${id}Msg`).removeClass('invalid-feedback');
    if (text) {
        getElem(`${id}Msg`).text(text);
    } else {
        getElem(`${id}Msg`).text('');
    }
}

export function setAlert(id, type, title, message) {
    let alertHtml = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            <strong>${title}</strong> : ${message}
            <button type="button" class="close" data-dismiss="alert" aria-label="close">
                <span aria-hidden="true">&times;</span>
            </button>
        </div>
    `;
    getElem(id).html(alertHtml);
}
