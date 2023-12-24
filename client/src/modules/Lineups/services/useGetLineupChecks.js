import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { setStateLineups } from "../redux/actions";
import { setStateUser } from "../../COMMON/redux/actions";
import { fetchCommon } from "../../COMMON/redux/actions";
import { fetchMatchups } from "../redux/actions";
import { getRecordDict } from "./helpers/getRecordDict";
import { checkIndexedDB } from "../../COMMON/services/helpers/indexedDb";

const useGetLineupChecks = () => {
    const dispatch = useDispatch();
    const { state, allplayers, schedule, projections } = useSelector(state => state.common)
    const { user_id, leagues, matchups, syncing, isLoadingMatchups } = useSelector(state => state.user);
    const {
        primaryContent,
        includeTaxi,
        week,
        lineupChecks,
        rankings,
        recordType,
        isLoadingProjectionDict,
        itemActive2,
        secondaryContent1,
        secondaryContent2,
    } = useSelector(state => state.lineups);

    const hash = `${includeTaxi}-${true}`


    useEffect(() => {
        if (leagues && state) {
            if (!schedule || !projections || (!matchups && !isLoadingMatchups)) {
                if (!schedule) {
                    dispatch(fetchCommon('schedule'));
                } else if (!matchups && !isLoadingMatchups) {
                    dispatch(fetchMatchups())
                } else if (!projections) {
                    dispatch(fetchCommon('projections'));


                }

            } else {
                const player_lineup_dict = {};

                leagues
                    .forEach(league => {
                        const matchup_user = league[`matchups_${week}`]?.find(m => m.roster_id === league.userRoster.roster_id);
                        const matchup_opp = league[`matchups_${week}`]?.find(m => m.matchup_id === matchup_user.matchup_id && m.roster_id !== matchup_user.roster_id);

                        matchup_user?.players
                            ?.forEach(player_id => {
                                if (!player_lineup_dict[player_id]) {
                                    player_lineup_dict[player_id] = {
                                        start: [],
                                        bench: [],
                                        start_opp: [],
                                        bench_opp: []
                                    }
                                }

                                if (league.settings.best_ball === 1 && week >= state.week) {
                                    const optimal_lineup = lineupChecks[week]?.[hash]?.[league.league_id]?.lc_user?.optimal_lineup

                                    if (optimal_lineup?.map(ol => ol.player)?.includes(player_id)) {
                                        player_lineup_dict[player_id].start.push(league)
                                    } else {
                                        player_lineup_dict[player_id].bench.push(league)
                                    }
                                } else {
                                    if (matchup_user.starters?.includes(player_id)) {
                                        player_lineup_dict[player_id].start.push(league)
                                    } else {
                                        player_lineup_dict[player_id].bench.push(league)
                                    }
                                }
                            })

                        matchup_opp?.players
                            ?.forEach(player_id => {
                                if (!player_lineup_dict[player_id]) {
                                    player_lineup_dict[player_id] = {
                                        start: [],
                                        bench: [],
                                        start_opp: [],
                                        bench_opp: []
                                    }
                                }

                                if (league.settings.best_ball === 1 && week >= state.week) {
                                    const optimal_lineup_opp = lineupChecks[week]?.[hash]?.[league.league_id]?.lc_opp?.optimal_lineup

                                    if (optimal_lineup_opp?.map(ol => ol.player)?.includes(player_id)) {
                                        player_lineup_dict[player_id].start_opp.push(league)
                                    } else {
                                        player_lineup_dict[player_id].bench_opp.push(league)
                                    }

                                } else {
                                    if (matchup_opp.starters?.includes(player_id)) {
                                        player_lineup_dict[player_id].start_opp.push(league)
                                    } else {
                                        player_lineup_dict[player_id].bench_opp.push(league)
                                    }
                                }
                            })
                    })

                dispatch(setStateLineups({ playerLineupDict: player_lineup_dict }));
            }
        }
    }, [leagues, matchups, week, isLoadingMatchups, schedule, projections, lineupChecks, week, hash, dispatch])





    useEffect(() => {
        const games_in_progress = schedule && state.week && schedule?.[state.week]
            ?.find(
                g => parseInt(g.gameSecondsRemaining) > 0
                    && parseInt(g.gameSecondsRemaining) < 3600
            )

        console.log({ games_in_progress })
        if (games_in_progress?.kickoff) {
            const min = new Date().getMinutes();
            const sec = new Date().getSeconds();

            const delay = ((60 - sec + 30) * 1000);
            let fetchProjectionInterval;

            setTimeout(() => {
                fetchProjectionInterval = setInterval(() => {
                    dispatch(fetchCommon('schedule'))
                    dispatch(fetchCommon('projections'))
                }, 1 * 60 * 1000)
            }, delay)

            return () => {
                clearInterval(fetchProjectionInterval)
            }
        }
    }, [schedule, state.week, dispatch])



    const weeks = Array.from(Array(18).keys()).map(key => key + 1)
        .filter(key => {
            if (key < state.week) {
                return !lineupChecks[key]
            } else {
                return !lineupChecks[key]?.['true-true']
            }
        })


    const getProjectedRecords = (week_to_fetch, includeTaxi, includeLocked, league_ids) => {


        dispatch(setStateLineups({ isLoadingProjectionDict: true }, 'LINEUPS'));

        const worker = new Worker('/getRecordDictWeekWorker.js')



        const result = getRecordDict({ week_to_fetch, state, leagues, allplayers, schedule, projections, includeTaxi, includeLocked, rankings, user_id, recordType, league_ids })




        if (result.week < state.week) {

            dispatch(setStateLineups({
                lineupChecks: {
                    ...lineupChecks,
                    [result.week]: {
                        ...lineupChecks[result.week],
                        ...result.projectedRecordWeek
                    }
                }
            }, 'LINEUPS'))



        } else {
            console.log({ result })
            dispatch(setStateLineups({
                lineupChecks: {
                    ...lineupChecks,
                    [result.week]: {
                        ...lineupChecks[result.week],
                        [`${includeTaxi}-${includeLocked}`]: {
                            ...lineupChecks[result.week]?.[`${includeTaxi}-${includeLocked}`],
                            ...result.projectedRecordWeek
                        }
                    }
                }
            }, 'LINEUPS'));
        }
    }

    useEffect(() => {
        if (allplayers && schedule && projections && matchups) {

            if (
                week === state.week
                && !(
                    !lineupChecks[week]?.[`${includeTaxi}-${true}`]
                    || Object.keys(lineupChecks[week]?.[`${includeTaxi}-${true}`])
                        .find(key => lineupChecks[week]?.[`${includeTaxi}-${true}`]?.[key]?.edited === true)
                )
            ) {
                getProjectedRecords(week, includeTaxi, true, false)
            }

        }
    }, [schedule, allplayers, projections, matchups, week, state, includeTaxi, dispatch])

    useEffect(() => {



        if (leagues && allplayers && schedule && projections && matchups) {

            if (
                (
                    (
                        week < state.week
                        && (
                            !lineupChecks[week]
                            || (lineupChecks[week]
                                && Object.keys(lineupChecks[week])
                                    .find(key => lineupChecks[week][key]?.edited === true)
                            )
                        )
                    ) || (
                        week >= state.week
                        && (
                            !lineupChecks[week]?.[`${includeTaxi}-${true}`]
                            || Object.keys(lineupChecks[week]?.[`${includeTaxi}-${true}`])
                                .find(key => lineupChecks[week]?.[`${includeTaxi}-${true}`]?.[key]?.edited === true)
                        )
                    )
                ) && !isLoadingProjectionDict
            ) {
                const league_ids = syncing
                    ? [syncing.league_id]
                    : (week < state.week && lineupChecks[week])
                        ? Object.keys(lineupChecks[week]).filter(key => lineupChecks[week][key]?.edited === true)
                        : (week >= state.week && lineupChecks[week]?.[`${includeTaxi}-${true}`])
                            ? Object.keys(lineupChecks[week]?.[`${includeTaxi}-${true}`]).find(key => lineupChecks[week]?.[`${includeTaxi}-${true}`]?.[key]?.edited === true)
                            : false

                console.log(`Syncing ${league_ids}`)
                getProjectedRecords(week, includeTaxi, true, league_ids)
            } else if (
                (
                    secondaryContent1 === 'Optimal'
                    || secondaryContent2 === 'Optimal'
                ) && (
                    (
                        week < state.week
                        && (
                            !lineupChecks[week]
                            || (lineupChecks[week]
                                && Object.keys(lineupChecks[week])
                                    .find(key => lineupChecks[week][key]?.edited === true)
                            )
                        )
                    ) || (
                        week >= state.week
                        && (
                            !lineupChecks[week]?.[`${includeTaxi}-${false}`]
                            || Object.keys(lineupChecks[week]?.[`${includeTaxi}-${false}`])
                                .find(key => lineupChecks[week]?.[`${includeTaxi}-${false}`]?.[key]?.edited === true)
                        )
                    )
                ) && !isLoadingProjectionDict
            ) {
                const league_ids = syncing
                    ? [syncing.league_id]
                    : (week < state.week && lineupChecks[week])
                        ? Object.keys(lineupChecks[week]).filter(key => lineupChecks[week][key]?.edited === true)
                        : (week >= state.week && lineupChecks[week]?.[`${includeTaxi}-${false}`])
                            ? Object.keys(lineupChecks[week]?.[`${includeTaxi}-${false}`]).find(key => lineupChecks[week]?.[`${includeTaxi}-${false}`]?.[key]?.edited === true)
                            : false

                console.log(`Syncing ${league_ids}`)
                getProjectedRecords(week, includeTaxi, false, league_ids)
            }

        }
    }, [leagues, week, weeks, state, allplayers, schedule, projections, dispatch, includeTaxi, lineupChecks, rankings, user_id, recordType, isLoadingProjectionDict, matchups, lineupChecks])

    useEffect(() => {
        if (isLoadingProjectionDict) {
            if (
                (
                    (week < state.week && (lineupChecks[week] && !(lineupChecks[week] && Object.keys(lineupChecks[week]).find(key => lineupChecks[week][key]?.edited === true))))
                    || (week >= state.week && (lineupChecks[week]?.[`${includeTaxi}-${true}`] && !Object.keys(lineupChecks[week]?.[`${includeTaxi}-${true}`]).find(key => lineupChecks[week]?.[`${includeTaxi}-${true}`]?.[key]?.edited === true)))
                ) || (
                    (
                        secondaryContent1 === 'Optimal'
                        || secondaryContent2 === 'Optimal'
                    ) &&
                    (
                        (week < state.week && (lineupChecks[week] && !(lineupChecks[week] && Object.keys(lineupChecks[week]).find(key => lineupChecks[week][key]?.edited === true))))
                        || (week >= state.week && (lineupChecks[week]?.[`${includeTaxi}-${false}`] && !Object.keys(lineupChecks[week]?.[`${includeTaxi}-${false}`]).find(key => lineupChecks[week]?.[`${includeTaxi}-${false}`]?.[key]?.edited === true)))
                    )
                )
            ) {
                dispatch(setStateLineups({ isLoadingProjectionDict: false }, 'LINEUPS'));
                syncing && dispatch(setStateUser({ syncing: false }, 'USER'));
            }
        }
    }, [dispatch, isLoadingProjectionDict, week, state, lineupChecks, includeTaxi, syncing, weeks])

    useEffect(() => {
        const lc_weeks = Object.keys(lineupChecks)

        if (lc_weeks.length === 18 && !lc_weeks.includes('totals')) {
            console.log('Getting Totals...')
            const season_totals_all = {};

            leagues
                .filter(league => league.settings.status === 'in_season')
                .forEach(league => {
                    const league_season_totals = {};

                    league.rosters
                        .forEach(roster => {

                            const roster_season_totals = Object.keys(lineupChecks)
                                .filter(key => parseInt(key) >= league.settings.start_week && parseInt(key) < league.settings.playoff_week_start)
                                .reduce((acc, cur) => {
                                    const cur_roster = lineupChecks[cur]?.['true-true']?.[league.league_id]?.standings?.[roster.roster_id]
                                    return {
                                        wins: acc.wins + (cur_roster?.wins || 0),
                                        losses: acc.losses + (cur_roster?.losses || 0),
                                        ties: acc.ties + (cur_roster?.ties || 0),
                                        fp: acc.fp + (cur_roster?.fp || 0),
                                        fpa: acc.fpa + (cur_roster?.fpa || 0)
                                    }
                                }, {
                                    wins: roster.settings.wins,
                                    losses: roster.settings.losses,
                                    ties: roster.settings.ties,
                                    fp: parseFloat(roster.settings.fpts + '.' + (roster.settings.fpts_decimal || 0)),
                                    fpa: parseFloat(roster.settings.fpts_against + '.' + (roster.settings.fpts_against_decimal || 0))
                                })

                            league_season_totals[roster.roster_id] = {
                                ...roster_season_totals,
                                user_id: roster.user_id,
                                username: roster.username,
                                avatar: roster.avatar
                            }

                        })

                    season_totals_all[league.league_id] = league_season_totals
                })

            dispatch(
                setStateLineups({
                    lineupChecks: {
                        ...lineupChecks,
                        totals: season_totals_all
                    }
                }, 'LINEUPS')
            )
        }
    }, [dispatch, lineupChecks])

    useEffect(() => {
        if (itemActive2) {
            dispatch(setStateLineups({ secondaryContent: 'Options' }, 'LINEUPS'));
        } else {
            dispatch(setStateLineups({ secondaryContent: 'Optimal' }, 'LINEUPS'));
        }
    }, [itemActive2, dispatch])


}

export default useGetLineupChecks;