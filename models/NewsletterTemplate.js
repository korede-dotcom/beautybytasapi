const { DataTypes } = require('sequelize');
const sequelize = require('../config/config');

const NewsletterTemplate = sequelize.define('NewsletterTemplate', {
    id: {
        type: DataTypes.STRING,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    preview: {
        type: DataTypes.STRING,
        allowNull: false
    },
    htmlTemplate: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    variables: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: []
    }
}, {
    timestamps: true
});

module.exports = NewsletterTemplate; 