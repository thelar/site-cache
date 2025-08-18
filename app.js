require('dotenv').config();
const app = require('express')();
let status;
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const axios = require("axios");
const {isAxiosError} = require("axios");
const base = '';
const io = new Server(server);
const cron = require('node-cron');
const sites = {
    prod: 'https://4x4tyres.co.uk/',
    staging: 'https://staging.4x4tyres.co.uk/',
}
let site = 'production';
let path_to_ajax;
if(process.env.NODE_ENV==='development'){
    path_to_ajax = 'https://4x4tyres83.localhost/';
}else if(site==='production'){
    path_to_ajax = sites.prod;
}else{
    path_to_ajax = sites.staging;
}

// Application data
let last_run;
let start;
let manufacturers = [];
let chassis = [];
let wheel_search_errors = [];
let wheel_size_errors = [];
let wheel_size_count = 0;
let paused = false;
let pause_start;
let pause_length = 6;
let end;

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
        switch(instruction.command){
            case 'run':
                run();
                break;
            case 'reset':
                stop();
                break;
            case 'print_last_stats':
                get_last_stats();
                break;
            case 'change_site':
                if(process.env.NODE_ENV!=='development'){
                    if(status!=='Running'){
                        site = instruction.to;
                        if(site==='production'){
                            path_to_ajax = sites.prod;
                        }else{
                            path_to_ajax = sites.staging;
                        }
                        app_console(`Site changed to ${site}`);
                    }else{
                        app_console('Cannot change site when status is Running');
                    }
                }else{
                    app_console('Cannot change site in development environment');
                }
                break;
            case 'pause':
                pause();
                break;
            default:
                break;
        }
    });
    if(typeof status === 'undefined'){
        changeStatus('Waiting');
    }else{
        app_console('Connected');
    }
});

server.listen(3000, function () {
    console.log('Example app listening on port 3000!');
});

cron.schedule('*/15 * * * *', () => {
    app_console('CRON');
    if(status!=='Running'){
        app_console('CRON: run()');
        run();
    }
});

function app_console(log){
    io.emit('console_update', log);
    io.emit('status_broadcast', {
        status: status,
        env: process.env.NODE_ENV,
        site: site,
    });
}

function changeStatus(to){
    status = to;
    io.emit('status_broadcast', {
        status: status,
        env: process.env.NODE_ENV,
        site: site,
    });
}

function run(){
    // Run app here
    if(status!=='Running'){
        changeStatus('Running');
        app_console('Started');
        start = new Date().toUTCString();
        get_manufacturers();
    }else{
        app_console('Cannot start app when status is already Running');
    }
}

function stop(){
    changeStatus('Waiting');
    app_console('Stopped');
    chassis = [];
    manufacturers = [];
    wheel_search_errors = [];
    wheel_size_errors = [];
    start = '';
    end = '';
    paused = false;
    wheel_size_count = 0;
}

function pause(){
    paused = true;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function wait() {
    for (let i = 0; i < pause_length * 60; i++) {
        app_console(`Waiting ${i} of ${pause_length * 60} seconds...`);
        await sleep(1000);
    }
    paused = false;
}

function get_last_stats(){

    if(typeof last_run === 'object'){
        app_console('LAST RUN STATS:');
        app_console(`Started: ${last_run.start}`);
        app_console(`Ended: ${last_run.end}`);
        app_console(`Chassis count: ${last_run.chassis_count}`);
        app_console(`Wheel size count: ${last_run.wheel_size_count}`);
        if(last_run.hasOwnProperty('wheel_search_errors')){
            if(last_run.wheel_search_errors.length){
                app_console(`${last_run.wheel_search_errors.length} Wheel search errors:`);
                last_run.wheel_search_errors.forEach((error) => {
                    app_console(`${error.name} (id: ${error.id}) Error: ${error.error}`);
                });
            }
        }
        if(last_run.hasOwnProperty('wheel_size_errors')){
            if(last_run.wheel_size_errors.length){
                app_console(`${last_run.wheel_size_errors.length} Wheel size errors:`);
                last_run.wheel_size_errors.forEach((error) => {
                    app_console(`${error.name} (id: ${error.id}) Error: ${error.error}`);
                });
            }
        }
    }else{
        app_console('NO LAST RUN STATS TO SHOW');
    }
}

function get_manufacturers(){
    app_console('Getting manufacturers');
    app_console('Path to ajax: ' + path_to_ajax);
    const sendGetRequest = async() => {
        try {
            const resp = await axios.get(path_to_ajax + 'fbf_cache?action=get_manufacturers');
            if(resp.status===200&&resp.data.results.status==='success'){
                app_console('SUCCESS');
                for(let manufacturer_id in resp.data.results.manufacturers){
                    app_console(`${resp.data.results.manufacturers[manufacturer_id].name}: ${manufacturer_id}`);
                    //get_chassis(manufacturer_id);
                    manufacturers.push({
                        id: manufacturer_id,
                        name: resp.data.results.manufacturers[manufacturer_id].name,
                    });
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

        app_console('Finished getting manufacturers');
        get_all_chassis();
    }
    sendGetRequest();
}

function get_all_chassis(){
    let errors = false;
    // Loop through manufacuturers
    /*for(let i=0;i<manufacturers.length;i++){
    //manufacturers.forEach((manufacturer) => {
        app_console(`Getting chassis for ${manufacturers[i].name}`)
        get_chassis(manufacturers[i].id);
    };*/

    /*const main = async() => {
        let items = [0, 1, 2, 3];
        for(let i=0;i<items.length;i++){
            await getData(items[i], 1000 * (5 - items[i]));
        }
        app_console('END OF MAIN');
    }*/

    const main = async() => {

        if(manufacturers.length){
            for(let i=0;i<manufacturers.length;i++){
                if(paused){
                    await wait();
                    app_console('Waiting done');
                }
                let resp = await getChassisData(manufacturers[i].id);

                if(isAxiosError(resp)){
                    app_console(`ERROR: ${resp}`);
                    errors = true;
                    if(resp.response.status===403){
                        // rewind i by 1
                        i = i - 1;
                        paused = true; // 403 response indicates we've triggered rate cap on Boughto - need to pause for a number of minutes - defined by pause_length
                    }
                    //break;
                }else{
                    app_console(`Got chassis data for manufacturer id: ${manufacturers[i].id}, execution time: ${resp.data.results.end_time - resp.data.results.start_time} seconds`);

                    resp.data.results.chassis.forEach(vehicle_chassis => {
                        chassis.push({
                            name: vehicle_chassis.display_name,
                            id: vehicle_chassis.id,
                            manufacturer_id: manufacturers[i].id,
                        });
                    });
                }
            }
            app_console('GET ALL CHASSIS DONE');
        }
    };
    main().then((res) => {
        // Here is when we start getting wheels
        if(!errors){
            app_console('Now get wheels');
            get_all_wheels();
        }
    });
}

function get_all_wheels(){
    let errors;
    /*chassis.forEach((vehicle_chassis) => {
        app_console(`Chassis: ${vehicle_chassis.name}`);
    });*/
    const main = async () => {
        if(chassis.length){
            for(let i=0;i<chassis.length;i++){
                if(paused){
                    await wait();
                    app_console('Waiting done');
                }

                app_console(`Getting wheels and wheel sizes for chassis id ${chassis[i].id} - ${chassis[i].name} [chassis ${i + 1} of ${chassis.length}]`);
                let resp = await getWheelData(chassis[i].id, chassis[i].name, chassis[i].manufacturer_id);

                if(isAxiosError(resp)) {
                    app_console(`ERROR: ${resp}`);
                    errors = true;
                    wheel_search_errors.push({
                        id: chassis[i].id,
                        name: chassis[i].name,
                        error: resp,
                    });

                    if(resp.response.status===403){
                        // rewind i by 1
                        i = i - 1;
                        paused = true; // 403 response indicates we've triggered rate cap on Boughto - need to pause for a number of minutes - defined by pause_length
                    }
                    //break;
                }else{
                    if(resp.data.results.status==='error'){
                        wheel_search_errors.push({
                            id: chassis[i].id,
                            name: chassis[i].name,
                            error: resp.data.results.error,
                        })
                    }else{
                        app_console(`Done: execution time: ${resp.data.results.wheels_timings.overall + resp.data.results.wheels_nft_timings.overall + resp.data.results.wheels_sizes_timings.overall}`);
                        let wheel_sizes = resp.data.results.wheels_sizes;
                        let sizes = [];
                        chassis[i].wheel_sizes = wheel_sizes;
                    }
                }
            }
            app_console('GET ALL WHEELS DONE');
        }
    }
    main().then((res) => {
        // Here is when we start getting wheels

        if(wheel_search_errors.length){
            app_console(`${wheel_search_errors.length} ERRORS:`);
            wheel_search_errors.forEach((error) => {
                app_console(`${error.name} (id: ${error.id}) Error: ${error.error}`);
            });
        }

        // - app_console('Now get Package Builder wheels for sizes');
        // - get_pb_wheel_sizes();

        /*if(!errors){
            app_console('Now get Package Builder wheels for sizes');
            get_pb_wheel_sizes();
        }*/

        /*app_console('DONE!');
        if(wheel_search_errors.length){
            app_console(`${wheel_search_errors.length} ERRORS:`);
            wheel_search_errors.forEach((error) => {
                app_console(`${error.name} (id: ${error.id}) Error: ${error.error}`);
            });
        }
        end = new Date().toUTCString();
        last_run = {
            start: start,
            end: end,
            errors: wheel_search_errors,
            chassis_count: chassis.length,
        };
        stop();*/

        app_console('Now store chassis fitment data in (wheel) product meta');
        count_wheel_chassis_rows();
    });
}

function get_pb_wheel_sizes(){
    let errors;
    const main = async () => {
        if(chassis.length) {
            for (let i = 0; i < chassis.length; i++) {
                if(paused){
                    await wait();
                    app_console('Waiting done');
                }

                let wheel_counter = 1;

                for (const size in chassis[i].wheel_sizes){
                    app_console(`Getting PB Wheels for Wheel size ${chassis[i].wheel_sizes[size]}" for chassis id ${chassis[i].id} - ${chassis[i].name} [chassis ${i + 1} of ${chassis.length}] [wheel size ${wheel_counter} of ${Object.keys(chassis[i].wheel_sizes).length}]`);
                    let resp = await getWheelSizeData(chassis[i].id, chassis[i].name, chassis[i].manufacturer_id, chassis[i].wheel_sizes[size]);

                    if(isAxiosError(resp)) {
                        app_console(`ERROR: ${resp}`);
                        errors = true;
                        wheel_size_errors.push({
                            id: chassis[i].id,
                            name: chassis[i].name,
                            size: chassis[i].wheel_sizes[size],
                            error: resp,
                        });
                        if(resp.response.status===403){
                            // rewind i by 1
                            i = i - 1;
                            paused = true; // 403 response indicates we've triggered rate cap on Boughto - need to pause for a number of minutes - defined by pause_length
                        }

                        //break;
                    }else{
                        if(resp.data.results.status==='error'){
                            wheel_size_errors.push({
                                id: chassis[i].id,
                                name: chassis[i].name,
                                size: chassis[i].wheel_sizes[size],
                                error: resp.data.results.error,
                            });
                        }else{
                            app_console(`Done: execution time: ${resp.data.results.overall_timing}`);
                            wheel_size_count++;
                        }
                    }
                    wheel_counter++;
                }
            }
            app_console('GET ALL WHEEL SIZES DONE');
        }
    }
    main().then((res) => {
        app_console('DONE!');
        if(wheel_search_errors.length){
            app_console(`${wheel_search_errors.length} WHEEL SEARCH ERRORS:`);
            wheel_search_errors.forEach((error) => {
                app_console(`${error.name} (id: ${error.id}) Error: ${error.error}`);
            });
        }

        if(wheel_size_errors.length){
            app_console(`${wheel_size_errors.length} WHEEL SIZE ERRORS:`);
            wheel_size_errors.forEach((error) => {
                app_console(`${error.name} (id: ${error.id} - size: ${error.size}) Error: ${error.error}`);
            });
        }

        //app_console('Now store chassis fitment data in (wheel) product meta');
        //count_wheel_chassis_rows();

        console.log('finished');



        /*end = new Date().toUTCString();
        last_run = {
            start: start,
            end: end,
            wheel_search_errors: wheel_search_errors,
            wheel_size_errors: wheel_size_errors,
            chassis_count: chassis.length,
            wheel_size_count: wheel_size_count,
        };
        stop();*/

        end = new Date().toUTCString();
        last_run = {
            start: start,
            end: end,
            wheel_search_errors: wheel_search_errors,
            wheel_size_errors: wheel_size_errors,
            chassis_count: chassis.length,
            wheel_size_count: wheel_size_count,
        };
        stop();
    });
}

function count_wheel_chassis_rows(){
    let batch_size = 10;
    let num_rows;
    const count = async () => {
        let resp = await getWheelChassisCount();
        if(isAxiosError(resp)) {
            app_console(`ERROR: ${resp}`);
        }else{
            app_console('Wheel chassis count done');
            num_rows = resp.data.results.num_rows;
            app_console('Num rows: ' + num_rows);
        }
    }
    count().then((res) => {
        store_wheel_chassis_data(num_rows, batch_size);
    });
}

function store_wheel_chassis_data(num_rows, batch_size){
    let num_batches = Math.ceil(num_rows/batch_size);
    const store = async () => {
        for(let i=0;i<num_batches;i++){
            let resp = await storeWheelChassisData(i, batch_size);
            if(isAxiosError(resp)) {
                app_console(`ERROR: ${resp}`);
            }else{
                app_console(`Saved batch ${i} of ${num_batches}`);
            }
        }
    }

    store().then((res) => {
        app_console('Store Wheel Chassis data DONE');

        store_chassis_wheel_data();
    });
}

function store_chassis_wheel_data(){
    const store = async () => {
        let resp = await storeChassisWheelData();
        if(isAxiosError(resp)) {
            app_console(`ERROR: ${resp}`);
        }else{
            if(resp.data.results.status==='success') {
                app_console(`Saved chassis/wheel data`);
            }else if(resp.data.results.status==='error'){
                app_console(`ERROR: ${resp.data.results.action} - ${resp.data.results.error}`);
            }
        }
    }

    store().then((res) => {
        app_console('Store Chassis/Wheel data DONE');

        app_console('Now get Package Builder wheels for sizes');
        get_pb_wheel_sizes();

        /*end = new Date().toUTCString();
        last_run = {
            start: start,
            end: end,
            wheel_search_errors: wheel_search_errors,
            wheel_size_errors: wheel_size_errors,
            chassis_count: chassis.length,
            wheel_size_count: wheel_size_count,
        };
        stop();*/
    });
}





async function getChassisData(id){
    try{
        return await axios.get(path_to_ajax + `fbf_cache?action=get_chassis&id=${id}`);
    }catch(err){
        return err;
    }
}

async function getWheelData(id, name, manufacturer_id){
    try{
        return await axios.get(path_to_ajax + `fbf_cache?action=get_wheels&id=${id}&vehicle=${name}&manufacturer_id=${manufacturer_id}`);
    }catch(err){
        return err;
    }
}

async function getWheelSizeData(id, name, manufacturer_id, wheel_size){
    try{
        return await axios.get(path_to_ajax + `fbf_cache?action=get_pb_wheels_for_size&id=${id}&vehicle=${name}&manufacturer_id=${manufacturer_id}&wheel_size=${wheel_size}`);
    }catch (err){
        return err;
    }
}

async function getWheelChassisCount(){
    try{
        return await axios.get(path_to_ajax + `fbf_cache?action=get_wheel_chassis_count`);
    }catch(err){
        return err;
    }
}

async function storeWheelChassisData(batch, batch_size){
    try{
        return await axios.get(path_to_ajax + `fbf_cache?action=store_wheel_chassis_data&batch=${batch}&batch_size=${batch_size}`);
    }catch(err){
        return err;
    }
}

async function storeChassisWheelData(){
    try{
        return await axios.get(path_to_ajax + `fbf_cache?action=store_chassis_wheel_data`);
    }catch(err){
        return err;
    }
}

