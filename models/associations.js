const Product = require('./Product');
const Images = require('./Images');

// Define associations
Product.hasMany(Images, {
    foreignKey: 'productId',
    as: 'images'
});

Images.belongsTo(Product, {
    foreignKey: 'productId'
});

module.exports = {
    Product,
    Images
}; 