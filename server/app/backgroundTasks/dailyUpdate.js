'use strict'

const { getAllPlayers, getState, getSchedule } = require('../helpers/getMain');
const fs = require('fs');
const axios = require('axios');

module.exports = async (app) => {
    setTimeout(async () => {
        await getState(app);

        if (process.env.HEROKU) {
            await getAllPlayers();
           
            await getSchedule(app.get('state'), true);
        }
    }, 1000)
    const now = new Date();

    let utc = new Date(now);

    utc.setUTCHours(8, 0, 0, 0);

    const delay = now - utc;

    setTimeout(async () => {
        setInterval(async () => {
            console.log('Daily update starting...')

            if (process.env.HEROKU) {
                await getAllPlayers();

            }

            await getState(app);

            console.log('Daily update complete...')
        }, 24 * 60 * 60 * 1 * 1000)
    }, delay)
}