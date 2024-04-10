require('dotenv').config();
const app = require('express')();
const root = '/site-cache';

app.get(root, (req, res) => {
    res.send('Hello World!');
});

server.listen(3000, function () {
    console.log('Example app listening on port 3000!');
});
