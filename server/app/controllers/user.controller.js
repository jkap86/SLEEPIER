'use strict'
const db = require("../models");
const User = db.users;
const League = db.leagues;
const axios = require('../api/axiosInstance');

exports.create = async (req, res, app) => {
    console.log(`***SEARCHING FOR ${req.query.username}***`)

    // check if user exists in Sleeper.  Update info if exists, send error message if not.
    let user;

    try {
        user = await axios.get(`http://api.sleeper.app/v1/user/${req.query.username}`)
    } catch (error) {
        console.log(error.message)
    }


    if (user?.data?.user_id) {
        const data = await User.upsert({
            user_id: user.data.user_id,
            username: user.data.display_name,
            avatar: user.data.avatar,
            type: 'S', // S = 'Searched'
            updatedAt: new Date()

        })

        req.userData = data[0].dataValues;
        res.send({
            user: {
                user_id: req.userData.user_id,
                username: req.userData.username,
                avatar: req.userData.avatar
            },
            state: app.get('state')
        })
    } else {
        res.send({ error: 'User not found' })
    }
}

exports.lmplayershares = async (req, res) => {
    try {
        const lmplayershares = await User.findAll({
            attributes: [
                'user_id',
                'username',
                'avatar',
                'playershares'
            ],
            include: [
                {
                    model: League,
                    attributes: [],
                    include: {
                        model: User,
                        through: { attributes: [] },
                        attributes: [],
                        where: {
                            user_id: req.query.user_id
                        }
                    },
                    required: true
                }
            ]
        })

        /*
        const lmleaguescount = await User.findAll({
            attributes: [
                'user_id',
                'username',
                'avatar',
                'playershares'
            ],
            where: {
                user_id: lmplayershares.map(lm => lm.dataValues.user_id)
            },
            include: {
                model: League,
                attributes: [],
                through: { attributes: [] },
                required: true
            },
            group: ['user.user_id']
        })
*/

        res.send(lmplayershares)
    } catch (error) {
        console.log(error)
    }
}

