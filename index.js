/*
    serial-monitor
    Author: Chris Wininger
    Notes: A file called .env should be placed in the root directory. Do not check this file in!
        It should contain:  the "API_KEY" for the lambda and the SERIAL_PORT address
 */
require('dotenv').config()
const SerialPort = require('serialport')
const axios = require('axios')
const { throttle }  = require('lodash')

const PORT = process.env.SERIAL_PORT
const BAUD_RATE = 57600
const lambdaURL = ' https://o1lb60h0zh.execute-api.us-east-1.amazonaws.com/dev/home-monitor-service-log-temp'
const DEBOUNCE_WAIT = 60000

// check if the data is what we are looking for and send to aws when appropriate
const processData = async (data, timeReceived) => {
    if (data && data.indexOf('{"temperature"') === 0) {
        const obj = JSON.parse(data)
        console.log('sending data: ' + JSON.stringify(obj))
        const opts = {
            url: `${lambdaURL}?temperature=${obj.temperature}&time_received=${encodeURIComponent(timeReceived)}`,
            method: 'post',
            headers: { 'x-api-key': process.env.API_KEY}
        }

        try {
            const { data } = await axios(opts)
            console.log('success: ' + JSON.stringify(data))
        } catch (err) {
            console.warn('error: ' + err)
        }
    }
}

// debounce the method so we don't spam AWS, that thing aint cheap
const runProcessData = throttle(processData, DEBOUNCE_WAIT)

// listen on the serial port for the temperature monitor
const port = new SerialPort(PORT, { baudRate: BAUD_RATE })
port.on('error', err => console.warn('error: ' + err))
port.on('data', payload => {
    const time = new Date(Date.now())
    console.log(`(${time}) received message: ${payload}`)
    runProcessData(payload, time)
})