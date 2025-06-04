const { DataTypes } = require('sequelize');
const sequelize = require('../config/config');

const Image = sequelize.define('Image', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    productId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'products',
            key: 'id'
        }
    },
    url: {
        type: DataTypes.STRING,
        allowNull: false
    },
    alt: {
        type: DataTypes.STRING,
        allowNull: true
    },
    order: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    }
}, {
    timestamps: true
});

module.exports = Image;


    // add a new field to the schema
    // this field will be used to store the user's cart