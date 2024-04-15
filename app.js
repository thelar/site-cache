require('dotenv').config();
const app = require('express')();
let status = 'Loading';
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const axios = require("axios");
const base = '/sitecache';
const io = new Server(server);
const path_to_ajax = 'https://4x4tyres.co.uk/';

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
                break;
            case 'reset':
                stop();
                break;
            default:
                break;
        }
    });

    changeStatus('Waiting');
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

function app_console(log){
    io.emit('console_update', log);
}

function changeStatus(to){
    status = to;
    io.emit('status_broadcast', status);
}

function run(){
    // Run app here
    changeStatus('Running');
    app_console('Started');
    get_manufacturers();
}

function stop(){
    changeStatus('Waiting');
    app_console('Stopped')
}

function get_manufacturers(){
    app_console('Getting manufacturers');
    const sendGetRequest = async() => {
        try {
            const resp = await axios.get(path_to_ajax + 'fbf_cache?action=get_manufacturers');
            app_console('SUCCESS: ' + resp.data);
        }catch(err){
            app_console('ERROR: ' + err.code);
        }
    }
    sendGetRequest();
}
