const Product = require('./Product');
const Image = require('./Images');
const Newsletter = require('./Newsletter');
const Subscriber = require('./Subscriber');
const NewsletterTemplate = require('./NewsletterTemplate');

// Product - Images association
Product.hasMany(Image, {
    foreignKey: 'productId',
    as: 'images',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
});

Image.belongsTo(Product, {
    foreignKey: 'productId',
    as: 'product'
});

// Newsletter associations
Newsletter.hasMany(Subscriber, {
    foreignKey: 'lastNewsletterId',
    as: 'subscribers'
});

Subscriber.belongsTo(Newsletter, {
    foreignKey: 'lastNewsletterId',
    as: 'lastNewsletter'
});

module.exports = {
    Product,
    Image,
    Newsletter,
    Subscriber,
    NewsletterTemplate
}; 