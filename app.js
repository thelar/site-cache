require('dotenv').config();
const app = require('express')();
let status = 'Waiting';
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const base = '/sitecache';
const io = new Server(server);

app.get(base + '/test', (req, res) => {
    res.sendFile('index.html', { root: __dirname });
});

app.get(base, (req, res) => {
    res.send('Hello World! ENV is: ' + process.env.NODE_ENV);
});

app.post(base + '/status', (req, res) => {
    res.json({
        status: status,
    });
});

io.on('connection', (socket) => {
    console.log('a user connected');
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });

    socket.on('tell_app', (instruction) => {
        switch(instruction){
            case 'run':
                run();
                changeStatus('Running')
                break;
            case 'reset':
                changeStatus('Waiting');
                break;
            default:
                break;
        }
    });
});

server.listen(3000, function () {
    console.log('Example app listening on port 3000!');
});

/*setInterval(() => {
    io.emit('status_broadcast', {
        message: 'ping',
        status: status,
    })
}, 1000);*/

function changeStatus(to){
    status = to;
    io.emit('status_broadcast', status);
}

function run(){
    // Run app here
}
