require('dotenv').config();
const app = require('express')();
const server = require('http').createServer(app);
const root = '/site-cache';

app.get(root, (req, res) => {
    res.send('Hello World!');
});

app.get(root + '/start', (req, res) => {
    res.json({
        "message": "started"
    });
});

app.get(root + '/console', function(req, res) {
    res.sendFile('index.html', { root: __dirname });
});

server.listen(3000, function () {
    console.log('Example app listening on port 3000!');
});
