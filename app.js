const express = require('express');
const app = express();
const root = '/site-cache';

app.get(root, (req, res) => {
    res.send('Hello World!');
});

app.get(root + '/start', (req, res) => {
    res.send('Start called');
});

app.listen(3000, function () {
    console.log('Example app listening on port 3000!');
});
