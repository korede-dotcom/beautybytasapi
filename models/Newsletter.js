const { DataTypes } = require('sequelize');
const sequelize = require('../config/config');

const Newsletter = sequelize.define('Newsletter', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    subject: {
        type: DataTypes.STRING,
        allowNull: false
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    htmlContent: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    template: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'basic'
    },
    sendToAll: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    recipients: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: []
    },
    scheduledDate: {
        type: DataTypes.DATE,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('draft', 'scheduled', 'sent', 'failed'),
        defaultValue: 'draft'
    },
    sentCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    failedCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    openRate: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },
    clickRate: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },
    sentAt: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    timestamps: true
});

module.exports = Newsletter; 