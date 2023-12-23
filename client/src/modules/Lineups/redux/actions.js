import axios from 'axios';


export const setStateLineups = (state_obj, tab) => ({
    type: `SET_STATE_LINEUPS`,
    payload: state_obj
})

export const fetchMatchups = () => {
    return async (dispatch, getState) => {

        const state = getState();

        const { leagues } = state.user;
        const display_week = state.common.state.week

        const all_matchups_to_update = [];

        leagues
            .filter(league => league.settings.status === 'in_season')
            .forEach(league => {
                const league_matchups_to_update = [];
                const start_week = league.settings.start_week;

                const matchupPtsWeek = (key) => {
                    return league[key]?.reduce((acc, cur) => acc + cur.points, 0)
                }

                Object.keys(league)
                    .filter(key => key.startsWith('matchups_'))
                    .forEach(key => {
                        const { wins, losses, ties } = league.settings;
                        const games = wins + losses + ties;
                        if (!league[key]) {
                            league_matchups_to_update.push(key)
                        } else {
                            const key_week = parseInt(key.split('_')[1])

                            if (key_week >= league.settings.start_week) {
                                if (
                                    key_week + 1 < display_week
                                    || (
                                        key_week + 1 === parseInt(display_week)
                                        && (
                                            league.settings.last_scored_leg < key_week
                                        )
                                    )
                                ) {
                                    if (!league.settings.matchups_final?.includes(key_week.toString())) {
                                        league_matchups_to_update.push(key)
                                    }
                                } else if (
                                    key_week === display_week
                                    && (
                                        !(
                                            league.settings.current_matchups_update > new Date().getTime() - 6 * 60 * 60 * 1000
                                        ) || (
                                            state.common.schedule[display_week].find(g => parseInt(g.gameSecondsRemaining) > 0 && parseInt(g.gameSecondsRemaining) < 3600)
                                            && !(league.settings.current_matchups_update > new Date().getTime() - 15 * 60 * 1000)
                                        ) || (
                                            state.common.schedule[display_week].find(g => parseInt(g.gameSecondsRemaining) === 0)
                                            && !(league.settings.current_matchups_update > new Date().getTime() - 3.5 * 60 * 60 * 1000)
                                        )
                                    )
                                ) {
                                    league_matchups_to_update.push(key)
                                } else if (key_week > display_week) {
                                    league[key]
                                        ?.forEach(matchup => {
                                            const matching_roster = league.rosters.find(r => r.roster_id === matchup.roster_id)

                                            const player_mismatch = [
                                                ...(matching_roster?.players || []).filter(player_id => !matchup.players?.includes(player_id))
                                            ];

                                            if (
                                                player_mismatch.length > 0
                                            ) {

                                                league_matchups_to_update.push(key)
                                            }
                                        })
                                }
                            }
                        }
                    })


                if (league_matchups_to_update.length > 0) {
                    all_matchups_to_update.push({
                        name: league.name,
                        league_id: league.league_id,
                        settings: league.settings,
                        weeks_to_update: Array.from(new Set(league_matchups_to_update))
                    })
                }
            })

        console.log({ all_matchups_to_update })
        if (all_matchups_to_update?.length > 0) {
            try {
                dispatch({ type: 'FETCH_MATCHUPS_START' });
                console.log({ all_matchups_to_update })
                const matchups = await axios.post('/league/matchups', {
                    all_matchups_to_update: all_matchups_to_update,
                    display_week: display_week
                })

                dispatch({ type: 'FETCH_MATCHUPS_SUCCESS', payload: matchups.data });
            } catch (err) {
                dispatch({ type: 'FETCH_MATCHUPS_FAILURE', payload: err.message });
            }
        } else {
            dispatch({ type: 'SET_STATE_USER', payload: { matchups: true } });
            console.log('No matchups to update...')
        }
    }
}

export const syncLeague = (league_id, user_id, username, week) => {
    return async (dispatch, getState) => {
        dispatch({ type: 'SYNC_LEAGUE_START' });

        const state = getState();
        const { common } = state;

        try {
            const updated_league = await axios.post(`/league/sync`, {
                league_id: league_id,
                username: username,
                week: week
            })
            console.log(updated_league.data)
            const hash = `${state.lineups.includeTaxi}-${true}`;
            const lineupChecks = state.lineups.lineupChecks;

            const userRoster = updated_league.data.rosters
                ?.find(r => r.user_id === user_id || r.co_owners?.find(co => co?.user_id === user_id))

            dispatch({
                type: 'SYNC_LEAGUES_SUCCESS',
                payload: {
                    league: {
                        ...updated_league.data,
                        userRoster: userRoster
                    },
                    state: common.state
                }
            });

            if (week < common.state.display_week) {
                dispatch({
                    type: 'SET_STATE_LINEUPS',
                    payload: {
                        lineupChecks: {
                            ...lineupChecks,
                            [week]: {
                                ...lineupChecks[week],
                                [league_id]: {
                                    ...lineupChecks[week][league_id],
                                    edited: true
                                }
                            }
                        }
                    }
                })
            } else {
                dispatch({
                    type: 'SET_STATE_LINEUPS',
                    payload: {
                        lineupChecks: {
                            ...lineupChecks,
                            [week]: {
                                ...lineupChecks[week],
                                [hash]: {
                                    ...lineupChecks[week][hash],
                                    [league_id]: {
                                        ...lineupChecks[week][hash][league_id],
                                        edited: true
                                    }
                                }
                            }
                        }
                    }
                });
            }

        } catch (error) {
            console.error(error)
            dispatch({ type: 'SYNC_LEAGUES_FAILURE' })
        }

    };
}