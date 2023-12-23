'use strict'

module.exports = async (app) => {
    const axios = require('../api/axiosInstance');
    const fs = require('fs');
    const { getStats } = require('../helpers/getStats');

    const getProjections = async (season, week) => {
        console.log('Update Projections...')

        const getPlayerScore = (stats_array, scoring_settings, total = false) => {

            let total_breakdown = {};

            stats_array?.map(stats_game => {
                Object.keys(stats_game?.stats || {})
                    .filter(x => Object.keys(scoring_settings).includes(x))
                    .map(key => {
                        if (!total_breakdown[key]) {
                            total_breakdown[key] = {
                                stats: 0,
                                points: 0
                            }
                        }
                        total_breakdown[key] = {
                            stats: total_breakdown[key].stats + stats_game.stats[key],
                            points: total_breakdown[key].points + (stats_game.stats[key] * scoring_settings[key])
                        }
                    })
            })

            return total
                ? Object.keys(total_breakdown).reduce((acc, cur) => acc + total_breakdown[cur].points, 0)
                : total_breakdown;
        }

        const projections_json = fs.readFileSync('./projections.json', 'utf-8')

        const limit = new Date().getMinutes() < 55
            ? 19
            : week + 1

        let projections = JSON.parse(projections_json);

        for (let i = 1; i < limit; i++) {
            console.log({ WEEK: i })
            if (i >= week || !JSON.parse(projections_json).find(p => p.week === i)) {

                projections = projections.filter(p => p.week !== i);

                const projections_to_update = JSON.parse(projections_json).filter(p => p.week === i);

                const updated_projections = []
                try {
                    for (const position of ['QB', 'RB', 'WR', 'TE']) {
                        const projections_week = await axios.get(`https://api.sleeper.com/projections/nfl/${season}/${i}?season_type=regular&position[]=${position}&order_by=ppr`)



                        projections_week.data
                            .forEach(pw => {
                                const projection_object = projections_to_update.find(p => p.player_id === pw.player_id)

                                if (projection_object) {
                                    updated_projections.push({
                                        ...projection_object,
                                        injury_status: pw.player.injury_status || '',
                                        projection: pw.stats || {}
                                    })
                                } else {
                                    updated_projections.push({
                                        week: i,
                                        player_id: pw.player_id,
                                        injury_status: pw.player.injury_status || '',
                                        projection: pw.stats || {},
                                    })
                                }
                            })
                    }


                    console.log(`Projections updated for Week ${i}`)
                } catch (err) {

                    console.log(err.message + ` week $${i}`)
                }
                console.log({ [i]: updated_projections.length })

                projections.push(...updated_projections)


            }
        }
        console.log('Projections Update Complete')
        fs.writeFileSync('./projections.json', JSON.stringify(projections))
    }

    if (process.env.HEROKU) {
        const minute = new Date().getMinutes()
        const delay = (14 - (minute % 14)) * 60 * 1000;

        if (delay > .5 * 60 * 1000) {
            setTimeout(async () => {
                const month = new Date().getMonth()
                const state = app.get('state')
                if (month > 5 && state) {
                    try {
                        await getProjections(state.season, state.week)

                        setTimeout(async () => {
                            await getStats(state.season, state.week)
                        }, 3000)

                    } catch (error) {
                        console.log(error)
                    }
                }
            }, 5000)
        }

        setTimeout(() => {
            setInterval(async () => {
                const month = new Date().getMonth();
                const state = app.get('state')
                if (month > 5 && state) {
                    await getProjections(state.league_season, state.display_week)
                }
            }, 15 * 60 * 1000)
        }, delay)
    }
}