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

    setInterval(() => {
        socket.emit('status_broadcast', 'ping')
    }, 1000);
});

server.listen(3000, function () {
    console.log('Example app listening on port 3000!');
});




/*app.get('/start', (req, res) => {
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
});*/
