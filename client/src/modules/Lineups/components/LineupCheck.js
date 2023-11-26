import { useSelector, useDispatch } from "react-redux";
import { setStateLineups } from "../redux/actions";
import Roster from "../../COMMON/components/Roster";
import TableMain from "../../COMMON/components/TableMain";
import { setStateUser } from "../../Players/redux/actions";
import { fetchMatchups, syncLeague } from "../redux/actions";
import { matchTeam } from "../../COMMON/services/helpers/matchTeam";

const LineupCheck = ({
    league,
    matchup_user,
    lineup_check,
    optimal_lineup,
    matchup_opp,
    lineup_check_opp,
    optimal_lineup_opp,
    players_projections,
    proj_score_user_actual,
    proj_score_user_optimal,
    proj_score_opp_actual,
    proj_score_opp_optimal,
    opp_username,
    proj_median
}) => {
    const dispatch = useDispatch();
    const { state, projections, allplayers, rankings, schedule } = useSelector(state => state.common);
    const { syncing, username, user_id } = useSelector(state => state.user);
    const {
        week,
        secondaryContent1,
        secondaryContent2,
        itemActive2
    } = useSelector(state => state.lineups);

    const oppRoster = league?.rosters.find(r => r.roster_id === matchup_opp?.roster_id);

    const active_player = lineup_check?.find(x => `${x.slot}_${x.index}` === itemActive2)?.current_player

    const opt_points = optimal_lineup?.reduce((acc, cur) => acc + matchup_user.players_points[cur.player], 0)

    const opp_opt_points = optimal_lineup_opp?.reduce((acc, cur) => acc + (matchup_opp.players_points[cur.player] || 0), 0)

    const handleSync = (league_id) => {
        dispatch(setStateUser({ syncing: { league_id: league_id, week: week } }))

        dispatch(syncLeague(league_id, user_id, username, week))
        dispatch(fetchMatchups())
    }

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

    const getInjuryAbbrev = (injury_status) => {
        switch (injury_status) {
            case 'Questionable':
                return 'Q'
            case 'Sus':
                return 'S'
            case 'Doubtful':
                return 'D'
            case 'Out':
                return 'O'
            case 'IR':
                return 'IR'
            default:
                return ''
        }
    }

    const lineup_headers = [
        [
            {
                text: (
                    (secondaryContent1 === 'Lineup' && league.settings.best_ball !== 1)
                        ? <>{matchup_user?.points} <em>({proj_score_user_actual?.toFixed(2)})</em></>
                        : (secondaryContent1 === 'Optimal' || league.settings.best_ball === 1)
                            ? <>{opt_points?.toFixed(2)} <em>({proj_score_user_optimal?.toFixed(2)})</em></>

                            : ''
                ),
                colSpan: 23,
                className: 'half'
            }
        ],
        [
            {
                text: 'Slot',
                colSpan: 3,
                className: 'half'
            },
            {
                text: 'Player',
                colSpan: 10,
                className: 'half'
            },
            {
                text: 'Opp',
                colSpan: 3,
                className: 'half'
            },
            {
                text: <div className="flex">
                    <p>Pts</p>
                    {
                        rankings
                            ? <p>
                                Rank
                            </p>
                            : <em>
                                Proj
                            </em>
                    }
                </div>,
                colSpan: 7,
                className: 'half'
            }
        ]
    ]
    console.log({ itemActive2 })

    const lineup_body = (secondaryContent1 === 'Lineup' && league.settings.best_ball !== 1)
        ? lineup_check?.map((slot, index) => {
            const color = (
                !optimal_lineup.find(x => x.player === slot.current_player) ? 'red'
                    : slot.earlyInFlex || slot.lateNotInFlex ? 'yellow'
                        : ''
            )

            return {
                id: slot.slot_index,
                list: !matchup_user ? [] : [
                    {
                        text: lineup_check?.find(x => x.current_player === slot.current_player)?.slot,
                        colSpan: 3,
                        className: color
                    },
                    {
                        text: <>
                            {
                                allplayers[slot.current_player]?.full_name || 'Empty'
                            }
                            <span className="player_inj_status">
                                {
                                    getInjuryAbbrev(projections[week]?.[slot.current_player]?.injury_status)
                                }
                            </span>
                        </>,
                        colSpan: 10,
                        className: color + " left relative",
                        image: {
                            src: slot.current_player,
                            alt: allplayers[slot.current_player]?.full_name,
                            type: 'player'
                        }
                    },
                    {
                        text: matchTeam(schedule[week]
                            ?.find(matchup => matchup.team.find(t => matchTeam(t.id) === allplayers[slot.current_player]?.team))
                            ?.team
                            ?.find(team => matchTeam(team.id) !== allplayers[slot.current_player]?.team)
                            ?.id) || 'FA',
                        colSpan: 3,
                        className: color
                    },
                    {
                        text: <div className="flex">
                            <p>
                                {getPlayerScore([projections[week][slot.current_player]], league.scoring_settings, true)?.toFixed(1) || '-'}
                            </p>
                            {
                                rankings
                                    ? <p>
                                        {
                                            rankings[slot.current_player]?.prevRank
                                            || 999
                                        }
                                    </p>
                                    : <em>
                                        {
                                            players_projections[slot.current_player]?.toFixed(1)
                                            || '-'
                                        }
                                    </em>
                            }
                        </div>,
                        colSpan: 7,
                        className: color
                    }
                ]
            }
        })
        : optimal_lineup?.map((ol, index) => {
            return {
                id: ol.slot + '__' + index,
                list: [
                    {
                        text: ol.slot,
                        colSpan: 3,

                    },
                    {
                        text: <>
                            {allplayers[ol.player]?.full_name || ol.player?.toString()}
                            <span className="player_inj_status">
                                {
                                    getInjuryAbbrev(projections[week]?.[ol.player]?.injury_status)
                                }
                            </span>
                        </>,
                        colSpan: 10,
                        className: 'left relative',
                        image: {
                            src: ol.player,
                            alt: allplayers[ol.player]?.full_name,
                            type: 'player'
                        }
                    },
                    {
                        text: matchTeam(schedule[state.week]
                            ?.find(matchup => matchup.team.find(t => matchTeam(t.id) === allplayers[ol.player]?.team))
                            ?.team
                            ?.find(team => matchTeam(team.id) !== allplayers[ol.player]?.team)
                            ?.id) || 'FA',
                        colSpan: 3
                    },
                    {
                        text: <div className="flex">
                            <p>
                            {getPlayerScore([projections[week][ol.player]], league.scoring_settings, true)?.toFixed(1) || '-'}
                            </p>
                            {
                                rankings
                                    ? <p>
                                        {
                                            rankings[ol.player]?.prevRank
                                            || 999
                                        }
                                    </p>
                                    : <em>
                                        {
                                            (players_projections[ol.player] || 0).toFixed(1)
                                            || '-'
                                        }
                                    </em>
                            }
                        </div>,
                        colSpan: 7
                    }
                ]
            }
        })

    let suboptimal_options;

    if (week >= state.week) {
        suboptimal_options = (matchup_user?.players || [])
            ?.filter(player_id => !optimal_lineup.find(ol => ol.player === player_id))

        itemActive2.split('__')[0] === 'SF'
            ? suboptimal_options = suboptimal_options.filter(player_id => ['QB', 'RB', 'FB', 'WR', 'TE'].includes(allplayers[player_id]?.position))
            : itemActive2.split('__')[0] === 'WRT'
                ? suboptimal_options = suboptimal_options.filter(player_id => ['RB', 'FB', 'WR', 'TE'].includes(allplayers[player_id]?.position))
                : itemActive2.split('__')[0] === 'W R'
                    ? suboptimal_options = suboptimal_options.filter(player_id => ['RB', 'FB', 'WR'].includes(allplayers[player_id]?.position))
                    : itemActive2.split('__')[0] === 'W T'
                        ? suboptimal_options = suboptimal_options.filter(player_id => ['WR', 'TE'].includes(allplayers[player_id]?.position))
                        : suboptimal_options = suboptimal_options.filter(player_id => allplayers[player_id]?.position === itemActive2.split('__')[0])
    }
    const subs_headers = [
        [
            {
                text: (
                    <>
                        {(secondaryContent2 === 'Lineup' && league.settings.best_ball !== 1)
                            ? <>{matchup_opp?.points} <em>({proj_score_opp_actual?.toFixed(2)})</em></>
                            : (secondaryContent2 === 'Optimal' || league.settings.best_ball === 1)
                                ? <>{opp_opt_points?.toFixed(2)} <em>({proj_score_opp_optimal?.toFixed(2)})</em></>
                                : ''
                        }
                        {
                            parseFloat(proj_median)
                                ? <em> Median: ({proj_median.toFixed(2)})</em>
                                : null
                        }
                    </>
                ),
                colSpan: 23,
                className: 'half'
            }
        ],
        [
            {
                text: 'Slot',
                colSpan: 3,
                className: 'half'
            },
            {
                text: 'Player',
                colSpan: 10,
                className: 'half'
            },
            {
                text: 'Opp',
                colSpan: 3,
                className: 'half'
            },
            {
                text: <div className="flex">
                    <p>Pts</p>
                    {
                        rankings
                            ? <p>
                                Rank
                            </p>
                            : <em>
                                Proj
                            </em>
                    }
                </div>,
                colSpan: 7,
                className: 'half'
            }
        ]
    ]

    const subs_body = itemActive2
        ? itemActive2.includes('__')
            ? suboptimal_options
                ?.sort((a, b) => (players_projections[b] || 0) - (players_projections[a] || 0))
                ?.map((opt_starter, index) => {
                    return {
                        id: opt_starter,
                        list: [
                            {
                                text: allplayers[opt_starter]?.position,
                                colSpan: 3
                            },
                            {
                                text: <>
                                    {
                                        allplayers[opt_starter]?.full_name || 'Empty'
                                    }
                                    <span className="player_inj_status">
                                        {
                                            getInjuryAbbrev(projections[week]?.[opt_starter]?.injury_status)
                                        }
                                    </span>
                                </>,
                                colSpan: 10,
                                className: 'left relative',
                                image: {
                                    src: opt_starter,
                                    alt: allplayers[opt_starter]?.full_name,
                                    type: 'player'
                                }
                            },
                            {
                                text: matchTeam(schedule[state.week]
                                    ?.find(matchup => matchup.team.find(t => matchTeam(t.id) === allplayers[opt_starter]?.team))
                                    ?.team
                                    ?.find(team => matchTeam(team.id) !== allplayers[opt_starter]?.team)
                                    ?.id) || 'FA',
                                colSpan: 3,
                            },
                            {
                                text: <div className="flex">
                                    <p>
                                        {
                                            (matchup_opp?.players_points[opt_starter] || 0)?.toFixed(1)

                                        }
                                    </p>
                                    {
                                        rankings
                                            ? <p>
                                                {
                                                    rankings[opt_starter]?.prevRank
                                                    || 999
                                                }
                                            </p>
                                            : <em>
                                                {
                                                    (players_projections[opt_starter] || 0).toFixed(1)
                                                    || '-'
                                                }
                                            </em>
                                    }
                                </div>,
                                colSpan: 7
                            }
                        ]
                    }
                })
            : [
                {
                    id: 'warning',
                    list: [
                        {
                            text: lineup_check?.find(x => x.slot_index === itemActive2)?.current_player === '0' ? 'Empty Slot' :
                                lineup_check?.find(x => x.slot_index === itemActive2)?.notInOptimal ? 'Move Out Of Lineup' :
                                    lineup_check?.find(x => x.slot_index === itemActive2)?.earlyInFlex ? 'Move Out Of Flex' :
                                        lineup_check?.find(x => x.slot_index === itemActive2)?.lateNotInFlex ? 'Move Into Flex'
                                            : '√',
                            colSpan: 23,
                            className: lineup_check?.find(x => x.slot_index === itemActive2)?.notInOptimal ? 'red'
                                : lineup_check?.find(x => x.slot_index === itemActive2)?.earlyInFlex || lineup_check?.find(x => x.slot_index === itemActive2)?.lateNotInFlex ? 'yellow'
                                    : 'green'
                        }
                    ]

                },

                ...(lineup_check?.find(x => x.slot_index === itemActive2)?.slot_options || [])
                    ?.sort(
                        (a, b) => (rankings && (rankings[a]?.prevRank || 999) - (rankings[b]?.prevRank || 999))
                            || players_projections[b] - players_projections[a]
                    )
                    ?.map((so, index) => {
                        const color = optimal_lineup.find(x => x.player === so) ? 'green' :
                            allplayers[so]?.rank_ecr < allplayers[active_player]?.rank_ecr ? 'yellow' : ''
                        return {
                            id: so,
                            list: [
                                {
                                    text: 'BN',
                                    colSpan: 3,
                                    className: color
                                },
                                {
                                    text: <>
                                        {
                                            allplayers[so]?.full_name || 'Empty'
                                        }
                                        <span className="player_inj_status">
                                            {
                                                getInjuryAbbrev(projections[week]?.[so]?.injury_status)
                                            }
                                        </span>
                                    </>,
                                    colSpan: 10,
                                    className: color + " left relative",
                                    image: {
                                        src: so,
                                        alt: allplayers[so]?.full_name,
                                        type: 'player'
                                    }
                                },
                                {
                                    text: matchTeam(schedule[state.week]
                                        ?.find(matchup => matchup.team.find(t => matchTeam(t.id) === allplayers[so]?.team))
                                        ?.team
                                        ?.find(team => matchTeam(team.id) !== allplayers[so]?.team)
                                        ?.id) || 'FA',
                                    colSpan: 3,
                                    className: color
                                },
                                {
                                    text: <div className="flex">
                                        <p>
                                            {
                                                matchup_user?.players_points[so].toFixed(1)
                                                || '-'

                                            }
                                        </p>
                                        {
                                            rankings
                                                ? <p>
                                                    {
                                                        rankings[so]?.prevRank
                                                        || 999
                                                    }
                                                </p>
                                                : <em>
                                                    {
                                                        (players_projections[so] || 0).toFixed(1)
                                                    }
                                                </em>
                                        }
                                    </div>,
                                    colSpan: 7
                                }
                            ]
                        }
                    })
            ]
        : secondaryContent2 === 'Optimal'
            ? optimal_lineup_opp?.map((opp_starter, index) => {
                return {
                    id: opp_starter.player || opp_starter,
                    list: [
                        {
                            text: lineup_check_opp[index]?.slot,
                            colSpan: 3
                        },
                        {
                            text: <>
                                {
                                    allplayers[opp_starter.player || opp_starter]?.full_name || 'Empty'
                                }
                                <span className="player_inj_status">
                                    {
                                        getInjuryAbbrev(projections[week]?.[opp_starter.player || opp_starter]?.injury_status)
                                    }
                                </span>
                            </>,
                            colSpan: 10,
                            className: 'left relative',
                            image: {
                                src: opp_starter.player || opp_starter,
                                alt: allplayers[opp_starter.player || opp_starter]?.full_name,
                                type: 'player'
                            }
                        },
                        {
                            text: matchTeam(schedule[state.week]
                                ?.find(matchup => matchup.team.find(t => matchTeam(t.id) === allplayers[opp_starter.player]?.team))
                                ?.team
                                ?.find(team => matchTeam(team.id) !== allplayers[opp_starter.player]?.team)
                                ?.id) || 'FA',
                            colSpan: 3,
                        },
                        {
                            text: <div className="flex">
                                <p>
                                    {
                                        matchup_opp?.players_points[opp_starter.player || opp_starter]?.toFixed(1)
                                        || '-'
                                    }
                                </p>
                                {
                                    rankings
                                        ? <p>
                                            {
                                                rankings[opp_starter.player || opp_starter]?.prevRank
                                                || 999
                                            }
                                        </p>
                                        : <em>
                                            {
                                                (players_projections[opp_starter.player] || 0).toFixed(1)
                                                || '-'
                                            }
                                        </em>
                                }
                            </div>,
                            colSpan: 7
                        }
                    ]
                }
            })
            : matchup_opp?.starters?.map((opp_starter, index) => {
                return {
                    id: opp_starter,
                    list: [
                        {
                            text: lineup_check_opp?.[index]?.slot,
                            colSpan: 3
                        },
                        {
                            text: <>
                                {
                                    allplayers[opp_starter]?.full_name || 'Empty'
                                }
                                <span className="player_inj_status">
                                    {
                                        getInjuryAbbrev(projections[week]?.[opp_starter]?.injury_status)
                                    }
                                </span>
                            </>,
                            colSpan: 10,
                            className: 'left relative',
                            image: {
                                src: opp_starter,
                                alt: allplayers[opp_starter]?.full_name,
                                type: 'player'
                            }
                        },
                        {
                            text: matchTeam(schedule[state.week]
                                ?.find(matchup => matchup.team.find(t => matchTeam(t.id) === allplayers[opp_starter]?.team))
                                ?.team
                                ?.find(team => matchTeam(team.id) !== allplayers[opp_starter]?.team)
                                ?.id) || 'FA',
                            colSpan: 3,
                        },
                        {
                            text: <div className="flex">
                                <p>
                                    {
                                        matchup_opp?.players_points[opp_starter]?.toFixed(1)
                                        || '-'
                                    }
                                </p>
                                {
                                    rankings
                                        ? <p>
                                            {
                                                rankings[opp_starter]?.prevRank
                                                || 999
                                            }
                                        </p>
                                        : <em>
                                            {
                                                (players_projections[opp_starter] || 0).toFixed(1)
                                                || '-'
                                            }
                                        </em>
                                }
                            </div>,
                            colSpan: 7
                        }
                    ]
                }
            })

    return week < state.week
        ? <>
            <div className="secondary nav">
                <div>
                    <button
                        className={secondaryContent1 === 'Lineup' ? 'active click' : 'click'}
                        onClick={() => dispatch(setStateLineups({ secondaryContent1: 'Lineup' }))}

                    >
                        Lineup
                    </button>
                    <p className="username">{username}</p>
                    <button
                        className={secondaryContent1 === 'Optimal' ? 'active click' : 'click'}
                        onClick={() => dispatch(setStateLineups({ secondaryContent1: 'Optimal' }))}
                        disabled={true}
                    >
                        Optimal
                    </button>
                </div>
                <button
                    className={`sync ${syncing ? 'rotate' : 'click'}`}
                    onClick={syncing ? null : () => handleSync(league.league_id)}

                >
                    <i className={`fa-solid fa-arrows-rotate ${syncing ? 'rotate' : ''}`}></i>
                </button>
                <div >
                    {
                        itemActive2
                            ? <button
                                className={'active click'}
                                onClick={() => dispatch(setStateLineups({ itemActive2: '' }))}
                            >
                                Options
                            </button>
                            : <>

                                <button
                                    className={secondaryContent2 === 'Lineup' ? 'active click' : 'click'}
                                    onClick={() => dispatch(setStateLineups({ secondaryContent2: 'Lineup' }, 'LINEUPS'))}

                                >
                                    Lineup
                                </button>
                                <p className="username">{oppRoster?.username}</p>
                                <button
                                    className={secondaryContent2 === 'Optimal' ? 'active click' : 'click'}
                                    onClick={() => dispatch(setStateLineups({ secondaryContent2: 'Optimal' }, 'LINEUPS'))}
                                    disabled={true}
                                >
                                    Optimal
                                </button>
                            </>
                    }

                </div>
            </div>
            {
                <>
                    <Roster
                        league={league}
                        roster={{
                            ...league.userRoster,
                            players: matchup_user?.players || [],
                            starters: matchup_user?.starters || [],
                        }}
                        type={'secondary half'}
                        previous={true}
                        players_projections={players_projections}
                        players_points={matchup_user?.players_points}
                        total_points={
                            secondaryContent1 === 'Lineup'
                                ? matchup_user?.points
                                : proj_score_user_optimal
                        }
                    />
                    <Roster
                        league={league}
                        roster={{
                            ...oppRoster,
                            players: matchup_opp?.players || [],
                            starters: matchup_opp?.starters || []
                        }}
                        type={'secondary half'}
                        previous={true}
                        players_projections={players_projections}
                        players_points={matchup_opp?.players_points}
                        total_points={
                            secondaryContent2 === 'Lineup'
                                ? matchup_opp?.points
                                : proj_score_opp_optimal
                        }
                    />
                </>
            }
        </>
        : <>
            <div className="secondary nav">
                <div>
                    <button
                        className={(secondaryContent1 === 'Lineup' && league.settings.best_ball !== 1) ? 'active click' : 'click'}
                        onClick={() => dispatch(setStateLineups({ secondaryContent1: 'Lineup' }, 'LINEUPS'))}
                        disabled={league.settings.best_ball === 1}
                    >
                        Lineup
                    </button>
                    <span>
                        <p className="username">{username}</p>
                    </span>
                    <button
                        className={(secondaryContent1 === 'Optimal' || league.settings.best_ball === 1) ? 'active click' : 'click'}
                        onClick={() => dispatch(setStateLineups({ secondaryContent1: 'Optimal' }, 'LINEUPS'))}
                    >
                        Optimal
                    </button>
                </div>
                <button
                    className={`sync ${syncing ? 'rotate' : 'click'}`}
                    onClick={syncing ? null : () => handleSync(league.league_id)}
                >
                    <i className={`fa-solid fa-arrows-rotate ${syncing ? 'rotate' : ''}`}></i>
                </button>
                <div >
                    {
                        itemActive2
                            ? <>
                                <button
                                    className={'click'}
                                    onClick={() => dispatch(setStateLineups({ itemActive2: '' }, 'LINEUPS'))}
                                >
                                    Opp
                                </button>
                                <button
                                    className={'active click'}
                                    onClick={() => dispatch(setStateLineups({ itemActive2: '' }, 'LINEUPS'))}
                                >
                                    Options
                                </button>
                            </>
                            : <>

                                <button
                                    className={(secondaryContent2 === 'Lineup' && league.settings.best_ball !== 1) ? 'active click' : 'click'}
                                    onClick={() => dispatch(setStateLineups({ secondaryContent2: 'Lineup' }, 'LINEUPS'))}
                                    disabled={league.settings.best_ball === 1}
                                >
                                    Lineup
                                </button>
                                <span>
                                    <p className="username">{opp_username}</p>
                                </span>
                                <button
                                    className={(secondaryContent2 === 'Optimal' || league.settings.best_ball === 1) ? 'active click' : 'click'}
                                    onClick={() => dispatch(setStateLineups({ secondaryContent2: 'Optimal' }, 'LINEUPS'))}
                                >
                                    Optimal
                                </button>
                            </>
                    }

                </div>
            </div>
            {
                lineup_body?.length >= 0 ?
                    <>
                        <TableMain
                            type={'secondary half'}
                            headers={lineup_headers}
                            body={lineup_body}
                            itemActive={itemActive2}
                            setItemActive={(value) => dispatch(setStateLineups({ itemActive2: value }, 'LINEUPS'))}
                        />
                        <TableMain
                            type={'secondary half'}
                            headers={subs_headers}
                            body={subs_body}
                        />
                    </>
                    :
                    <div>
                        <h1>No Matchups</h1>
                    </div>
            }
        </>
}

export default LineupCheck;