const { ObjectID } = require('bson');
const Product = require('./productsModel');

module.exports = function CartProduct(oldCart) {
    this.owner = oldCart.owner,
        this.items = oldCart.items,
        this.bill = oldCart.bill,
        this.add = async function (id) {
            let storedItem = this.items.filter((item) => {
                return id.includes(item.itemId);
            })
            storedItem[0].quantity++;
            const product = await Product.findOne({ _id: id })
            storedItem[0].price = storedItem[0].quantity * +product.discountedPrice
            this.bill += +product.discountedPrice;
            // console.log(storedItem);
            return storedItem
        },
        this.subtract = async function (id) {
            let storedItem = this.items.filter((item) => {
                return id.includes(item.itemId);
            })
            storedItem[0].quantity--;
            const product = await Product.findOne({ _id: id })
            storedItem[0].price = storedItem[0].quantity * +product.discountedPrice
            this.bill -= +product.discountedPrice;
            return storedItem
        }
}