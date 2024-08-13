const jwt = require('jsonwebtoken');
const os = require('os');
const MobileDevice = require('../models/MobileDevice');
const TerminalUser = require("../models/TerminalUser")
const Agent = require("../models/Agent")


const AuthUser = (req, res, next) => {

    // const token = req.cookies.jwt;
    const token = req.header('Authorization')?.split(' ')[1];
    // const token = req.session.user;
    if (!token) {
        return res.status(401).json({
            message: 'You are not logged in!',
            status: false
        });
    }
    jwt.verify(token, process.env.JWT_SECRET, async (err, decodedToken) => {
        if (err) {
            return res.status(401).json({
                status: false,
                message: 'You are not logged in!'
            });
        }
        req.user = decodedToken;
        req.token = token;

        next();
    });
}





module.exports = AuthUser;