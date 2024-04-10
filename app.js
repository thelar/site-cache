const express = require('express');
const app = express();
const root = '/site-cache';

app.get(root, (req, res) => {
    res.send('Hello World!');
});

app.get(root + '/start', (req, res) => {
    res.json({
        "message": "started"
    });
});

app.listen(3000, function () {
    console.log('Example app listening on port 3000!');
});
