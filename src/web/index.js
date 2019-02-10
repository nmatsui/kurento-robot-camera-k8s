import io from 'socket.io-client';

window.onload = () => {
    document.getElementById('start').onclick = start;
    document.getElementById('stop').onclick = stop;
};

let socket = null;

function start() {
    socket = io();
    socket.on('message', (message) => {
        console.log(message);
    });
    socket.emit('message', 'hello');
}

function stop() {
    if (socket) {
        socket.close();
    }
    socket = null;
}
