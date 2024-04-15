require('dotenv').config();
const app = require('express')();
let status = 'Loading';
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const axios = require("axios");
const base = '/sitecache';
const io = new Server(server);
const path_to_ajax = process.env.NODE_ENV === 'production' ? 'https://staging.4x4tyres.co.uk/' : 'https://4x4tyres.localhost/';

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
    app_console('Path to ajax: ' + path_to_ajax);
    const sendGetRequest = async() => {
        try {
            const resp = await axios.get(path_to_ajax + 'fbf_cache?action=get_manufacturers');
            if(resp.status===200&&resp.data.results.status==='success'){
                app_console('SUCCESS');
                let manufacturers = [];
                for(let manufacturer_id in resp.data.results.manufacturers){
                    app_console(`${resp.data.results.manufacturers[manufacturer_id].name}: ${manufacturer_id}`);
                    get_chassis(manufacturer_id);
                }
            }else{
                if(resp.status!==200){
                    app_console(`ERROR: axios request returned a status of ${resp.status}`);
                }else{
                    app_console(`ERROR: ${resp.data.results.action} - ${resp.data.results.error}`);
                }
            }
        }catch(err){
            app_console('ERROR: ' + err.code);
        }
    }
    sendGetRequest();
}

async function get_chassis(manufacturer_id){
    const resp = await axios.get(path_to_ajax + `fbf_cache?action=get_chassis&id=${manufacturer_id}`);
    if(resp.status===200&&resp.data.results.status==='success'){
        app_console(`Chassis for manufacturer ID: ${manufacturer_id}`);
        resp.data.results.chassis.forEach(chassis => {
            app_console(`${chassis.display_name} (Chassis ID - ${chassis.id})`);
            get_wheels(chassis.id, chassis.display_name);
        });
    }
}

async function get_wheels(chassis_id, vehicle){
    app_console(`Getting wheels for ${vehicle}`);
    try {
        const resp = await axios.get(path_to_ajax + `fbf_cache?action=get_wheels&id=${chassis_id}&vehicle=${vehicle}`);

        if(resp.status===200&&resp.data.results.status==='success'){
            app_console(`Wheels for chassis ID: ${chassis_id}`);
            app_console(`${resp.data.results.wheels}`);
        }
    }catch(err){
        app_console('ERROR: ' + err.code);
    }
}
