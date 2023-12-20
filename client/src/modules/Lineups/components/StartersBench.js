import TableMain from "../../COMMON/components/TableMain";
import { useSelector, useDispatch } from "react-redux";
import { setStateLineups } from "../redux/actions";
import { filterLeagues } from "../../COMMON/services/helpers/filterLeagues";
import FilterIcons from "../../COMMON/components/FilterIcons";

const StartersBench = ({ secondaryTable }) => {
    const dispatch = useDispatch();
    const { allplayers, state, projections } = useSelector(state => state.common);
    const { username, type1, type2 } = useSelector(state => state.user);
    const { page, itemActive, searched, filters, playerLineupDict, sortBy, playoffs, week } = useSelector(state => state.lineups);

    const players_headers = [
        [
            {
                text: 'Player',
                colSpan: 3,
                rowSpan: 2,
                className: 'half'
            },
            {
                text: 'PPR',
                colSpan: 2,
                className: 'half'
            },
            {
                text: username,
                colSpan: 2,
                className: 'half'
            },
            {
                text: 'Opp',
                colSpan: 2,
                className: 'half'
            }
        ],
        [
            {
                text: 'Proj',
                colSpan: 1,
                className: 'half'
            },
            {
                text: 'Actual',
                colSpan: 1,
                className: 'half'
            },
            {
                text: 'Start',
                colSpan: 1,
                onClick: () => dispatch(setStateLineups({ sortBy: 'start' })),
                className: 'half'
            },
            {
                text: 'Bench',
                colSpan: 1,
                onClick: () => dispatch(setStateLineups({ sortBy: 'bench' })),
                className: 'half'
            },
            {
                text: 'Start',
                colSpan: 1,
                onClick: () => dispatch(setStateLineups({ sortBy: 'start_opp' })),
                className: 'half'
            },
            {
                text: 'Bench',
                colSpan: 1,
                onClick: () => dispatch(setStateLineups({ sortBy: 'bench_opp' })),
                className: 'half'
            }
        ]
    ]

    console.log({ playerLineupDict })

    const players_body = Object.keys(playerLineupDict)
        ?.filter(player_id => (
            (!searched.id || searched.id === player_id)
            && (
                filters.position === allplayers[player_id]?.position
                || filters.position.split('/').includes(allplayers[player_id]?.position?.slice(0, 1))
            ) && (
                filters.team === 'All' || allplayers[player_id]?.team === filters.team
            ) && (
                filters.draftClass === 'All' || parseInt(filters.draftClass) === (state.league_season - allplayers[parseInt(player_id)]?.years_exp)
            )
        ))
        ?.sort((a, b) => filterLeagues(playerLineupDict[b][sortBy], type1, type2)
            ?.filter(l => !playoffs || (
                l.settings.winners_bracket
                    .find(
                        wb => (wb.r === (state.week - l.settings.playoff_week_start + 1))
                            && (
                                wb.t1 === l.userRoster.roster_id
                                || wb.t2 === l.userRoster.roster_id
                            )
                            && (
                                !wb.p
                                || wb.p === 1
                            )
                    )

            ))?.length
            -
            filterLeagues(playerLineupDict[a][sortBy], type1, type2)
                ?.filter(l => !playoffs || (
                    l.settings.winners_bracket
                        .find(
                            wb => (wb.r === (state.week - l.settings.playoff_week_start + 1))
                                && (
                                    wb.t1 === l.userRoster.roster_id
                                    || wb.t2 === l.userRoster.roster_id
                                )
                                && (
                                    !wb.p
                                    || wb.p === 1
                                )
                        )

                ))?.length
        )
        ?.map(player_id => {
            const start = filterLeagues(playerLineupDict[player_id]?.start || [], type1, type2)
                ?.filter(l => !playoffs || (
                    l.settings.winners_bracket
                        .find(
                            wb => (wb.r === (state.week - l.settings.playoff_week_start + 1))
                                && (
                                    wb.t1 === l.userRoster.roster_id
                                    || wb.t2 === l.userRoster.roster_id
                                )
                                && (
                                    !wb.p
                                    || wb.p === 1
                                )
                        )

                ))
            const bench = filterLeagues(playerLineupDict[player_id]?.bench || [], type1, type2)
                ?.filter(l => !playoffs || (
                    l.settings.winners_bracket
                        .find(
                            wb => (wb.r === (state.week - l.settings.playoff_week_start + 1))
                                && (
                                    wb.t1 === l.userRoster.roster_id
                                    || wb.t2 === l.userRoster.roster_id
                                )
                                && (
                                    !wb.p
                                    || wb.p === 1
                                )
                        )

                ))
            const start_opp = filterLeagues(playerLineupDict[player_id]?.start_opp || [], type1, type2)
                ?.filter(l => !playoffs || (
                    l.settings.winners_bracket
                        .find(
                            wb => (wb.r === (state.week - l.settings.playoff_week_start + 1))
                                && (
                                    wb.t1 === l.userRoster.roster_id
                                    || wb.t2 === l.userRoster.roster_id
                                )
                                && (
                                    !wb.p
                                    || wb.p === 1
                                )
                        )

                ))
            const bench_opp = filterLeagues(playerLineupDict[player_id]?.bench_opp || [], type1, type2)
                ?.filter(l => !playoffs || (
                    l.settings.winners_bracket
                        .find(
                            wb => (wb.r === (state.week - l.settings.playoff_week_start + 1))
                                && (
                                    wb.t1 === l.userRoster.roster_id
                                    || wb.t2 === l.userRoster.roster_id
                                )
                                && (
                                    !wb.p
                                    || wb.p === 1
                                )
                        )

                ))

            const ppr_projection = projections?.[week]?.[player_id]?.projection?.pts_ppr
            const ppr_points = projections?.[week]?.[player_id]?.stats?.pts_ppr

            return {
                id: player_id,
                search: {
                    text: allplayers[player_id]?.full_name,
                    image: {
                        src: player_id,
                        alt: 'player',
                        type: 'player'
                    }
                },
                list: [
                    {
                        text: allplayers[player_id]?.full_name,
                        image: {
                            src: player_id,
                            alt: 'player',
                            type: 'player'
                        },
                        className: 'left',
                        colSpan: 3
                    },
                    {
                        text: ppr_projection?.toString() || '-',
                        colSpan: 1,
                        className: ''
                    },
                    {
                        text: ppr_points?.toString() || '-',
                        colSpan: 1,
                        className: ''
                    },
                    {
                        text: start.length.toString(),
                        colSpan: 1,
                        className: 'check'
                    },
                    {
                        text: bench.length.toString(),
                        colSpan: 1,
                        className: 'check'
                    },
                    {
                        text: start_opp.length.toString(),
                        colSpan: 1,
                        className: 'check'
                    },
                    {
                        text: bench_opp.length.toString(),
                        colSpan: 1,
                        className: 'check'
                    }
                ],
                secondary_table: secondaryTable({
                    start,
                    bench,
                    start_opp,
                    bench_opp
                })
            }
        })

    return <TableMain
        type={'primary'}
        headers={players_headers}
        body={players_body}
        page={page}
        setPage={(value) => dispatch(setStateLineups({ page: value }))}
        itemActive={itemActive}
        setItemActive={(value) => dispatch(setStateLineups({ itemActive: value }))}
        search={true}
        searched={searched}
        setSearched={(value) => dispatch(setStateLineups({ searched: value }))}
        options1={[
            <FilterIcons
                type={'team'}
                filterTeam={filters.team}
                setFilterTeam={(value) => dispatch(setStateLineups({ filters: { ...filters, team: value } }))}
            />
        ]}
        options2={[
            <FilterIcons
                type={'position'}
                filterPosition={filters.position}
                setFilterPosition={(value) => dispatch(setStateLineups({ filters: { ...filters, position: value } }))}
                picks={false}
            />,
            <label className="playoffs">
                <input type="radio" checked={playoffs} onClick={(e) => dispatch(setStateLineups({ playoffs: !playoffs }))} />
                Playoff Leagues
            </label>
        ]}
    />
}

export default StartersBench;