require('dotenv').config();
const app = require('express')();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const port = process.env.PORT || 3000;
const root = '/site-cache';
const axios = require('axios');
const path_to_ajax = 'https://4x4tyres.localhost/'

app.get(root + '/console', function(req, res) {
    res.sendFile('index.html', { root: __dirname });
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

io.on('connection', (socket) => {
    console.log('user connected');
    socket.on('disconnect', function () {
        console.log('user disconnected');
    });
});

app.listen(3000, function() {
    console.log(`Listening on port ${port}`);
});
