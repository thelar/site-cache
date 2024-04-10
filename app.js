require('dotenv').config();
const app = require('express')();
const root = '/site-cache';
const axios = require('axios');
const path_to_ajax = process.env.NODE_ENV==='development'?'https://4x4tyres.localhost/':'/';

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

app.get(root, (req, res) => {
    res.send('Hello World! ENV is: ' + process.env.NODE_ENV);
});

app.listen(3000, function () {
    console.log('Example app listening on port 3000!');
});
