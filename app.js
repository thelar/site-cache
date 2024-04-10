require('dotenv').config();
const app = require('express')();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const root = '/site-cache';

app.get(root, (req, res) => {
    res.send('Hello World!');
});

app.get(root + '/console', function(req, res) {
    res.sendFile('index.html', { root: __dirname });
});

app.get(root + '/start', (req, res) => {
    res.json({
        "message": "started"
    });
});

app.get(root + '/console', function(req, res) {
    res.sendFile('index.html', { root: __dirname });
});

io.on('connection', (socket) => {
    console.log('user connected');
    socket.on('disconnect', function () {
        console.log('user disconnected');
    });
});

server.listen(3000, function () {
    console.log('Example app listening on port 3000!');
});
