require('dotenv').config();
const app = require('express')();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const root = '/site-cache';
const axios = require('axios');
const path_to_ajax = 'https://4x4tyres.localhost/';

app.get(root, (req, res) => {
    res.send('Hello World!');
});

app.get(root + '/start', (req, res) => {
    const sendGetRequest = async() => {
        try {
            const resp = await axios.get(path_to_ajax + 'fbf_cache?action=get_manufacturers');
            console.log(resp.data);
            res.json(resp.data);
        }catch(err){
            console.log(err);
            res.send('ERROR: ' + err.code);
        }
    }
    sendGetRequest();
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

app.listen(3000, function () {
    console.log('Example app listening on port 3000!');
});
