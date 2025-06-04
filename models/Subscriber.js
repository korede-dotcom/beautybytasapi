const { DataTypes } = require('sequelize');
const sequelize = require('../config/config');

const Subscriber = sequelize.define('Subscriber', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    name: {
        type: DataTypes.STRING,
        allowNull: true
    },
    subscribed: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    subscribedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    unsubscribedAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    source: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'manual_add'
    },
    tags: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: []
    },
    lastEmailSent: {
        type: DataTypes.DATE,
        allowNull: true
    },
    emailsReceived: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    emailsOpened: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    emailsClicked: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    }
}, {
    timestamps: true
});

module.exports = Subscriber; 