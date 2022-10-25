const User = require('../model/userModel');
const Admin = require('../model/adminModel');
const { ObjectID } = require('bson');
const Product = require('../model/productsModel');
const Cart = require('../model/cartModel');
const Wishlist = require('../model/wishlistModel');
const Order = require("../model/orderModel");
const Category = require('../model/categoryModel');
const Coupon = require('../model/couponModel');
const CartProduct = require('../model/cart');
const otp = require('../middlewares/otp');
const Razorpay = require('razorpay');
const Paypal = require('paypal-rest-sdk');
const excelJs = require('exceljs');
const e = require('express');


let session;

const validation = {
    categoryExists: false,
    couponExists: false,
    couponOnceApplied: false,
    expiredCoupon: false,
    invalidCoupon: false,
    couponSuccessfullyApplied: false,
    insufficientCartValue: false,
    changeConfirmPassError : false,
    changeOldPassError : false
}

const getCategory = function () {
    return new Promise((resolve, reject) => {
        Category.find()
            .then((categories) => {
                resolve(categories);
            })
            .catch(() => {
                const error = new Error("could not find categories")
                reject(error);
            })
    })
}

const updateCoupons = function (couponCode, user) {
    return new Promise((resolve, reject) => {
        Coupon.updateOne({ couponCode: couponCode }, { $push: { users: user } })
            .then(() => {
                resolve();
            })
            .catch(() => {
                const err = new Error('could not update')
                reject(err);
            })
    })
}

const createOrder = function (order) {
    return new Promise((resolve, reject) => {
        order.items.forEach((item) => {
            item.orderStatus = 'processed'
        })
        const newOrder = new Order(order);
        newOrder.save()
            .then(() => resolve())
            .catch(() => {
                const err = new Error('could not save');
                reject(err);
            })
    })
}

const deleteCart = function (user) {
    return new Promise((resolve, reject) => {
        Cart.deleteOne({ owner: user })
            .then(() => {
                resolve();
            })
            .catch(() => {
                const err = new Error('could not delete Cart')
                reject(err);
            })
    })
}

const validateCoupon = function () {
    return new Promise((resolve, reject) => {
        Coupon.find()
            .then((coupons) => {
                if (coupons.length > 0) {

                    coupons.forEach((coupon) => {
                        if (coupon.couponExpiry >= Date.now()) {
                            const status = "Active";
                            updateCouponStatus(coupon, status)
                                .then(() => {
                                    return
                                })
                                .catch((err) => {
                                    console.log(err.message);
                                })
                        } else {
                            const status = "Expired"
                            updateCouponStatus(coupon, status)
                                .then(() => {
                                    return
                                })
                                .catch((err) => {
                                    console.log(err.message);
                                })
                        }
                    })
                    resolve();
                } else {
                    resolve();
                }
            })
            .catch(() => {
                const err = new Error('could not find Coupon');
                reject(err);
            })
    })
}

const updateCouponStatus = function (coupon, status) {
    return new Promise((resolve, reject) => {
        Coupon.updateOne({ _id: coupon._id }, { $set: { status: status } })
            .then(() => {
                resolve();
            })
            .catch(() => {
                const err = new Error('could not updated coupon')
                reject(err);
            })
    })
}

const findUser = function (userEmail) {
    return new Promise((resolve, reject) => {
        User.findOne({ email : userEmail })
            .then((user) => {
                resolve(user);
            })
            .catch(() => {
                const err = new Error('could not update user')
                reject(err);
            })
    })
}

const updateUser = function (user, editAddressIndex, newAddress) {
    return new Promise((resolve, reject) => {
        user.address.splice(+editAddressIndex, 1, newAddress)
        User.replaceOne({ email : user.email }, user)
            .then(() => {
                resolve();
            })
            .catch(() => {
                const err = new Error('could not replace user');
                reject(err);
            })
    })
}

const findProducts = function (category) {
    return new Promise((resolve, reject) => {
        Product.find({ category : category })
            .then((products) => {
                resolve(products);
            })
            .catch(() => {
                const err = new Error('could not find Product')
                reject(err);
            })
    })
}

const findCart = function (products, user) {
    return new Promise((resolve, reject) => {
        Cart.findOne({ owner : user })
            .then((cart) => {
                resolve([cart, products]);
            })
            .catch(() => {
                const err = new Error('could not find cart');
                reject(err);
            })
    })
}

const updateUserPassword = function (user, newPassword) {
    return new Promise((resolve, reject) => {
        User.updateOne({ email : user }, { $set : { password : newPassword.toString() } })
        .then(() => {
            resolve();
        })
        .catch(() => {
            const err = new Error('could not update user')
            reject(err);
        })
    })
}

const replaceProduct = function (productId, updatedProduct) {
    return new Promise((resolve, reject) => {
        Product.replaceOne({ _id : productId }, updatedProduct)
            .then(() => {
                resolve();
            })
            .catch(() => {
                const err = new Error('could not replace product')
                reject(err);
            })
    })
}

const updateProduct = function (productId, updatedProduct) {
    return new Promise((resolve, reject) => {
        Product.updateOne({ _id : productId }, { $set : {
            productName : updatedProduct.productName,
            actualPrice : updatedProduct.actualPrice,
            discountedPrice : updatedProduct.discountedPrice,
            description : updatedProduct.description,
            stock : updatedProduct.stock,
            category : updatedProduct.category
        } })
        .then(() => {
            resolve();
        })
        .catch(() => {
            const err = new Error('could not update product')
            reject(err);
        })
    })
}

const editUser = function (user, updatedUser) {
    return new Promise((resolve, reject) => {
        User.updateOne({ email : user }, { $set : { name : updatedUser.name, email : updatedUser.email, mobile : updatedUser.mobile, avatar : updatedUser.avatar } })
            .then(() => {
                resolve();
            })
            .catch(() => {
                const err = new Error('user could not be updated');
                reject(err);
            })
    })
}

//session handling//
exports.isLoggedIn = (req, res, next) => {
    session = req.session;
    if (session.userId) {
        next();
    } else
        res.redirect('/user_signin');
}

exports.isLoggedOut = (req, res, next) => {
    session = req.session;
    if (!session.userId) {
        next();
    } else
        res.redirect('/user_home');
}

exports.adminLoggedIn = (req, res, next) => {
    session = req.session;
    if (session.adminId) {
        next();
    } else
        res.redirect('/admin_login');
}

exports.adminLoggedOut = (req, res, next) => {
    session = req.session;
    if (!session.adminId) {
        next();
    } else
        res.redirect('/admin_panel/dashboard')
}

exports.isMobileFound = (req, res, next) => {
    session = req.session;
    if (session.mobileNumber) {
        next();
    } else
        res.redirect('/mobile_verification')
}
/////////////////////

exports.user = (req, res) => {
    res.redirect('/user_signin')
}

exports.userHome = (req, res) => {
    req.session.coupon = ''
    getCategory()
        .then((categories) => {
            let wishlist = Wishlist.findOne({ owner: req.session.userId })
                .then((oldWishlist) => {
                    if (oldWishlist) {
                        return oldWishlist.items;
                    } else
                        return [];
                })
                .catch((err) => {
                    console.log(err.message);
                })
            wishlist.then((wishlist) => {
                if(req.query.category){
                    findProducts(req.query.category.toUpperCase())
                        .then((products) => {
                            return findCart(products, req.session.userId)
                        })
                        .catch((err) => {
                            console.log(err.message);
                        })
                        .then(([cart, products]) => {
                            if (cart) {
                                res.render('user/home', { products, cart, wishlist, categories });
                            } else {
                                res.render('user/home', { products, cart: { items: [] }, wishlist, categories })
                            }
                        })
                        .catch((err) => {
                            console.log(err.message);
                        })
                }else{
                    Product.find()
                    .then((products) => {
                        if (products) {
                            Cart.findOne({ owner: req.session.userId })
                                .then((cart) => {
                                    if (cart) {
                                        res.render('user/home', { products, cart, wishlist, categories });
                                    } else {
                                        res.render('user/home', { products, cart: { items: [] }, wishlist, categories })
                                    }
                                })
                                .catch((err) => {
                                    console.log(err.message);
                                })
                        }
                    })
                    .catch((err) => {
                        console.log(err.message)
                    })
                }
                
            })
            .catch((err) => {
                console.log(err.message);
            })
        })
        .catch((err) => {
            console.log(err.message);
        })
}

exports.userLogin = (req, res) => {
    req.session.mobileNumber = "";
    let response = {
        passErr: req.query.pass,
        passErrMssg: "Password Incorrect !!",
        registerErr: req.query.register,
        registerErrMssg: "User not Registered !!",
        blockErr: req.query.block,
        blockErrMssg: "You were blocked by the Admin !!"
    }
    res.render('user/login', { response })
}

exports.userSignup = (req, res) => {
    let response = {
        passMatchErr: req.query.passwordMatch,
        passMatchErrMssg: "Password and Confirm Password does not match !!",
        userExistsErr: req.query.userExists,
        userExistsErrMssg: "User Already registered !!"
    }
    res.render('user/signup', { response })
}

exports.mobileVerification = (req, res) => {
    if (!req.session.otpLogin) {
        let response = {
            mobile: req.query.mobile,
            mobileErrMssg: 'Mobile number not registered !!',
            blockErr: req.query.block,
            blockErrMssg: "User is blocked by the admin !!"
        }
        res.render('user/mobileVerification', { response });
    } else {
        res.redirect('/user_home')
    }
}

exports.otpPage = (req, res) => {
    if (!req.session.otpLogin) {
        let response = {
            otpErr: req.query.otp,
            otpErrMssg: "Otp Invalid !!"
        }
        res.render('user/verifyOtp', { response })
    } else {
        res.redirect('/user_home')
    }
}

exports.wishlist = (req, res) => {
    req.session.coupon = ''
    getCategory()
        .then((categories) => {
            let wishlist = Wishlist.findOne({ owner: req.session.userId })
                .then((oldWishlist) => {
                    if (oldWishlist) {
                        return oldWishlist.items;
                    } else
                        return [];
                })
                .catch((err) => {
                    console.log(err.message);
                })
            wishlist
                .then((wishlist) => {
                    Cart.findOne({ owner: req.session.userId })
                        .then((cart) => {
                            if (cart)
                                res.render('user/wishlist', { cart, wishlist, categories })
                            else
                                res.render('user/wishlist', { cart: { items: [] }, wishlist, categories })
                        })
                        .catch((err) => {
                            console.log(err.message);
                        })
                })
                .catch((err) => {
                    console.log(err.message);
                })
        })
        .catch((err) => {
            console.log(err.message);
        })
}

exports.cart = (req, res) => {
    req.session.coupon = ''
    getCategory()
        .then((categories) => {
            let wishlist = Wishlist.findOne({ owner: req.session.userId })
                .then((oldWishlist) => {
                    if (oldWishlist) {
                        return oldWishlist.items;
                    } else
                        return [];
                })
                .catch((err) => {
                    console.log(err.message);
                })
            wishlist
                .then((wishlist) => {
                    Cart.findOne({ owner: req.session.userId })
                        .then((cart) => {
                            if (cart) {
                                res.render('user/cart', { cart, wishlist, categories });

                            } else
                                res.render('user/cart', { cart: { items: [] }, wishlist, categories });
                        })
                        .catch((err) => {
                            console.log(err.message);
                        })
                })
                .catch((err) => {
                    console.log(err.message);
                })
        })
        .catch((err) => {
            console.log(err.message);
        })
}

exports.checkout = (req, res) => {
    req.session.coupon = ''
    getCategory()
        .then((categories) => {
            let wishlist = Wishlist.findOne({ owner: req.session.userId })
                .then((oldWishlist) => {
                    if (oldWishlist) {
                        return oldWishlist.items;
                    } else
                        return [];
                })
                .catch((err) => {
                    console.log(err.message);
                })
            wishlist.then((wishlist) => {
                User.findOne({ email: req.session.userId })
                    .then((user) => {
                        Cart.findOne({ owner: req.session.userId })
                            .then((cart) => {
                                let userAddress = user.address
                                if (cart) {
                                    if (user.address.length) {
                                        res.render('user/checkout', { cart, userAddress, wishlist, categories })
                                    } else {
                                        res.redirect('/cart/checkout/shipping/add-new-address?userAddress=false')
                                    }
                                } else {
                                    if (user.address.length) {
                                        res.render('user/checkout', { cart: { items: [] }, userAddress, wishlist, categories })
                                    } else {
                                        res.redirect('/cart/checkout/shipping/add-new-address?userAddress=false')
                                    }
                                }
                            })
                            .catch((err) => {
                                console.log(err.message);
                            })
                    })
                    .catch((err) => {
                        console.log(err.message);
                    })
            })
            .catch((err) => {
                console.log(err.message);
            })
        })
        .catch((err) => {
            console.log(err.message);
        })
}

exports.addAddress = (req, res) => {
    getCategory()
        .then((categories) => {
            let wishlist = Wishlist.findOne({ owner: req.session.userId })
                .then((oldWishlist) => {
                    if (oldWishlist) {
                        return oldWishlist.items;
                    } else
                        return [];
                })
                .catch((err) => {
                    console.log(err.message);
                })
            wishlist.then((wishlist) => {
                Cart.findOne({ owner: req.session.userId })
                    .then((cart) => {
                        let userAddress = req.query.userAddress ? true : false;
                        if (cart) {
                            if (userAddress) {
                                res.render('user/addAddress', { cart, userAddress, wishlist, categories })
                            } else {
                                res.render('user/addAddress', { cart, wishlist, categories })
                            }
                        } else {
                            res.render('user/addAddress', { cart: { items: [] }, userAddress, wishlist, categories })
                        }
                    })
                    .catch((err) => {
                        console.log(err.message);
                    })
            })
            .catch((err) => {
                console.log(err.message);
            })
        })
        .catch((err) => {
            console.log(err.message);
        })
}

exports.paymentPage = (req, res) => {
    getCategory()
        .then((categories) => {
            indexOfSelectedAddress = req.query.index
            let wishlist = Wishlist.findOne({ owner: req.session.userId })
                .then((oldWishlist) => {
                    if (oldWishlist) {
                        return oldWishlist.items;
                    } else
                        return [];
                })
                .catch((err) => {
                    console.log(err.message);
                })
            wishlist.then((wishlist) => {
                User.findOne({ email: req.session.userId })
                    .then((user) => {
                        if (req.session.anonymousAddress) {
                            userAddress = req.session.anonymousAddress
                            Cart.findOne({ owner: req.session.userId })
                                .then((cart) => {
                                    if (cart) {
                                        res.render('user/payment', { userAddress, cart, wishlist, categories })
                                    } else {
                                        res.render('user/payment', { userAddress, cart: { items: [] }, wishlist, categories })
                                    }
                                })
                                .catch((err) => {
                                    console.log(err.message);
                                })
                        } else {
                            userAddress = user.address[+req.query.index]
                            Cart.updateOne({ owner: req.session.userId }, { $set: { address: userAddress } })
                                .then(() => {
                                    Cart.findOne({ owner: req.session.userId })
                                        .then((cart) => {
                                            res.render('user/payment', { cart, wishlist, indexOfSelectedAddress, categories })
                                        })
                                        .catch((err) => {
                                            console.log(err.message);
                                        })
                                })
                                .catch((err) => {
                                    console.log(err.message);
                                })
                        }
                    })
                    .catch((err) => {
                        console.log(err.message);
                    })
            })
            .catch((err) => {
                console.log(err.message);
            })
        })
        .catch((err) => {
            console.log(err.message);
        })
}

exports.paypal = (req, res) => {
    const INR_USD_CONVERTION_RATE = 0.01368
    const bill = Math.round(+req.session.order.orderBill * INR_USD_CONVERTION_RATE)

    Paypal.configure({
        'mode': 'sandbox', //sandbox or live 
        'client_id': 'AY5_-16rOvJrN2R7C0QCtrTMg1P2UqYLX2-PTbPSF93S-ku4Sq-57naztMndefFK7muUUTJTSdNAz_F2', // please provide your client id here 
        'client_secret': 'EMHCTP8wTbEvA9WAVaTfSQEGs7x9oU9nA5nfntwoeymSPmKRO1tD9zhy5QWgn_HvYDqR3IO3-kzajJcb' // provide your client secret here 
    });

    // create payment object 
    const payment = {
        "intent": "authorize",
        "payer": {
            "payment_method": "paypal"
        },
        "redirect_urls": {
            "return_url": 'http://localhost:5050/order-success-redirect',
            "cancel_url": "http://127.0.0.1:3000/err"
        },
        "transactions": [{
            "amount": {
                "total": `${+bill}`,
                "currency": "USD"
            },
            "description": " a book on mean stack "
        }]
    }

    const createPay = (payment) => {
        return new Promise((resolve, reject) => {
            Paypal.payment.create(payment, function (err, payment) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(payment);
                }
            });
        });
    }

    // call the create Pay method 
    createPay(payment)
        .then((transaction) => {
            var id = transaction.id;
            var links = transaction.links;
            var counter = links.length;
            while (counter--) {
                if (links[counter].method == 'REDIRECT') {
                    // redirect to paypal where user approves the transaction 
                    return res.redirect(links[counter].href)
                }
            }
        })
        .catch((err) => {
            console.log(err);
            res.redirect('/err');
        });


}

exports.razorpay = (req, res) => {
    const bill = req.session.order.orderBill

    const razorpay = new Razorpay({
        key_id: `${process.env.RAZORPAY_KEY_ID}`,
        key_secret: `${process.env.RAZORPAY_KEY_SECRET}`
    })

    const options = {
        amount: bill * 100,  // amount in the smallest currency unit
        currency: "INR"
    };

    razorpay.orders.create(options, function (err, order) {
        res.json({ razorpay: true, order });
    });
}


exports.orderSuccess = (req, res) => {
    getCategory()
        .then((categories) => {
            let wishlist = Wishlist.findOne({ owner: req.session.userId })
                .then((oldWishlist) => {
                    if (oldWishlist) {
                        return oldWishlist.items;
                    } else
                        return [];
                })
                .catch((err) => {
                    console.log(err.message);
                })
            wishlist.then((wishlist) => {
                couponCode = req.session.coupon.couponCode || ''
                user = req.session.userId
                updateCoupons(couponCode, user)
                    .then(() => {
                        newOrder = req.session.order;
                        return createOrder(newOrder)
                    })
                    .catch((err) => {
                        console.log(err.message);
                    })
                    .then(() => {
                        return deleteCart(user)
                    })
                    .catch((err) => {
                        console.log(err.message);
                    })
                    .then(() => {
                        res.render('user/orderSuccess', { cart: { items: [] }, wishlist, categories })
                    })
                    .catch((err) => {
                        console.log(err.message);
                    })

            })
            .catch((err) => {
                console.log(err.message);
            })
        })
        .catch((err) => {
            console.log(err.message);
        })
}

exports.productView = (req, res) => {
    getCategory()
        .then((categories) => {
            let wishlist = Wishlist.findOne({ owner: req.session.userId })
                .then((oldWishlist) => {
                    if (oldWishlist) {
                        return oldWishlist.items;
                    } else
                        return [];
                })
                .catch((err) => {
                    console.log(err.message);
                })
            wishlist.then((wishlist) => {
                Product.findOne({ _id: ObjectID(req.query.id) })
                    .then((product) => {
                        Cart.findOne({ "items.itemId": ObjectID(req.query.id) })
                            .then((cart) => {
                                if (cart) {
                                    res.render('user/productView', { product, cart, wishlist, categories })
                                } else
                                    res.render('user/productView', { product, cart: { items: [] }, wishlist, categories })
                            })
                            .catch((err) => {
                                console.log(err.message);
                            })
                    })
                    .catch((err) => {
                        console.log(err.message);
                    })
            })
            .catch((err) => {
                console.log(err.message);
            })
        })
        .catch((err) => {
            console.log(err.message);
        })
}

exports.myAccount = (req, res) => {
    req.session.coupon = ''
    getCategory()
        .then((categories) => {
            let wishlist = Wishlist.findOne({ owner: req.session.userId })
                .then((oldWishlist) => {
                    if (oldWishlist) {
                        return oldWishlist.items;
                    } else
                        return [];
                })
                .catch((err) => {
                    console.log(err.message);
                })
            wishlist.then((wishlist) => {
                Cart.findOne({ owner: req.session.userId })
                    .then((cart) => {
                        User.findOne({ email : req.session.userId })
                            .then((user) => {
                                if(req.query.edit){
                                    if (cart) {
                                        res.render('user/myAccount', { cart, wishlist, categories, user, index : req.query.index, userEdit : {} });
                                    } else
                                        res.render('user/myAccount', { cart: { items: [] }, wishlist, categories, user, index : req.query.index, userEdit : {} });
                                }else if(req.query.add){
                                    if (cart) {
                                        res.render('user/myAccount', { cart, wishlist, categories, user, index : '', add : req.query.add, userEdit : {} });
                                    } else
                                        res.render('user/myAccount', { cart: { items: [] }, wishlist, categories, user, index : '', add : req.query.add, userEdit : {} });
                                }else if(req.query.passEdit){
                                    if (cart) {
                                        res.render('user/myAccount', { cart, wishlist, categories, user, index : '', add : '', passEdit : req.query.passEdit, validation, userEdit : {} });
                                        validation.changeConfirmPassError = false;
                                        validation.changeOldPassError = false;
                                    } else
                                        res.render('user/myAccount', { cart: { items: [] }, wishlist, categories, user, index : '', add : "", passEdit : req.query.passEdit, validation, userEdit : {} });
                                        validation.changeConfirmPassError = false;
                                        validation.changeOldPassError = false;
                                }else if(req.query.userEdit){
                                    if (cart) {
                                        res.render('user/myAccount', { cart, wishlist, categories, user, index : '', add : req.query.add, passEdit : '', userEdit : user });
                                    } else
                                        res.render('user/myAccount', { cart: { items: [] }, wishlist, categories, user, index : '', add : req.query.add, passEdit : '', userEdit : user });
                                }else{
                                    if (cart) {
                                        res.render('user/myAccount', { cart, wishlist, categories, user, index : '', add : '', passEdit : '', userEdit : {} });
                                    } else
                                        res.render('user/myAccount', { cart: { items: [] }, wishlist, categories, user, index : '', add : '', passEdit : '', userEdit : {} });
                                }
                                
                            })
                            .catch((err) => {
                                console.log(err.message);
                            })
                    })
                    .catch((err) => {
                        console.log(err.message);
                    })
            })
            .catch((err) => {
                console.log(err.message);
            })
        })
        .catch((err) => {
            console.log(err.message);
        })
}

exports.editAddress = (req, res) => {
    const editAddressIndex = req.query.index;
    console.log(editAddressIndex)
    const userEmail = req.session.userId;
    const newAddress = {
        name : req.body.name,
        mobile : req.body.mobile,
        address1 : req.body.address1,
        address2 : req.body.address2,
        city : req.body.city,
        state : req.body.state,
        zip : req.body.zip
    }

    findUser(userEmail)
        .then((user) => {
            return updateUser(user, editAddressIndex, newAddress);
        })
        .catch((err) => {
            console.log(err.message)
        })
        .then(() => {
            res.redirect('/myAccount');
        })
        .catch((err) => {
            console.log(err.message);
        })
}

exports.changePassword = (req, res) => {
    const currPassword = req.body.currPass;
    const newPassword = req.body.newPass;
    const repeatPassword = req.body.repeatPass;

    function validateCurrPassword(currPass, user) {
        if(currPass === user.password) {
            return true;
        }else 
            return false;
    }

    function validatePasswordAndConfirmPassword(newPassword, repeatPassword) {
        if(newPassword === repeatPassword) {
            return true;
        }else
            return false;
    }

    findUser(req.session.userId)
        .then((user) => {
            const oldPassValidated = validateCurrPassword(currPassword, user)
            if(oldPassValidated) {
                const newPassValidated = validatePasswordAndConfirmPassword(newPassword, repeatPassword)
                if(newPassValidated) {
                    updateUserPassword(user.email, newPassword)
                    .then(() => {
                        res.redirect('/myAccount');
                    })
                    .catch((err) => {
                        console.log(err.message)
                    })
                }else{
                    validation.changeConfirmPassError = true;
                    res.redirect('/myAccount?passEdit=true')
                }
            }else{
                validation.changeOldPassError = true;
                res.redirect('/myAccount?passEdit=true')
            }
        })
        .catch((err) => {
            console.log(err.message);
        })
        
        
}

exports.editUser = (req, res) => {
    const updatedUser = {
        name : req.body.name,
        email : req.body.email,
        mobile : req.body.mobile,
        avatar : req.files[0] && req.files[0].filename ? req.files[0].filename : ""
    }
    editUser(req.session.userId, updatedUser)
        .then(() => {
            res.redirect('/myAccount');
        })
        .catch((err) => {
            console.log(err.message);
        })
}

exports.allOrders = (req, res) => {
    getCategory()
        .then((categories) => {
            let wishlist = Wishlist.findOne({ owner: req.session.userId })
                .then((oldWishlist) => {
                    if (oldWishlist) {
                        return oldWishlist.items;
                    } else
                        return [];
                })
                .catch((err) => {
                    console.log(err.message);
                })
            wishlist.then((wishlist) => {
                Order.find({ owner: req.session.userId })
                    .then((orders) => {
                        Cart.findOne({ owner: req.session.userId })
                            .then((cart) => {
                                if (cart) {
                                    if (orders)
                                        res.render('user/allOrders', { cart, wishlist, orders, categories });
                                    else
                                        res.render('user/allOrders', { cart, wishlist, orders: [], categories });
                                } else
                                    if (orders)
                                        res.render('user/allOrders', { cart: { items: [] }, wishlist, orders, categories });
                                    else
                                        res.render('user/allOrders', { cart: { items: [] }, wishlist, orders: [], categories });
                            })
                            .catch((err) => {
                                console.log(err.message);
                            })
                    })
                    .catch((err) => {
                        console.log(err.message);
                    })
            })
            .catch((err) => {
                console.log(err.message);
            })
        })
        .catch((err) => {
            console.log(err.message);
        })
}

exports.orderStatus = (req, res) => {
    getCategory()
        .then((categories) => {
            orderId = req.query.id;
            let wishlist = Wishlist.findOne({ owner: req.session.userId })
                .then((oldWishlist) => {
                    if (oldWishlist) {
                        return oldWishlist.items;
                    } else
                        return [];
                })
                .catch((err) => {
                    console.log(err.message);
                })
            wishlist.then((wishlist) => {
                Cart.findOne({ owner: req.session.userId })
                    .then((cart) => {
                        Order.findOne({ _id: req.query.id })
                            .then((order) => {
                                if (cart) {
                                    res.render('user/orderStatus', { cart, wishlist, order, categories })
                                } else
                                    res.render('user/orderStatus', { cart: { items: [] }, wishlist, order, categories })
                            })
                            .catch((err) => {
                                console.log(err.message);
                            })
                    })
                    .catch((err) => {
                        console.log(err.message);
                    })
            })
            .catch((err) => {
                console.log(err.message);
            })
        })
        .catch((err) => {
            console.log(err.message);
        })
}

exports.adminLogin = (req, res) => {
    let response = {
        passErr: req.query.pass,
        passErrMssg: "Password Incorrect !!",
        registerErr: req.query.register,
        registerErrMssg: "Admin not found !!"
    }
    res.render('admin/login', { response });
}

exports.adminPanel = (req, res) => {
    res.render('admin/dashboard');
}

exports.userManagement = (req, res) => {
    User.find((err, users) => {
        if (!err) {
            res.render('admin/users', { users });
        }else{
            console.log(err.message);
        }
    })
}

exports.productManagement = (req, res) => {
    Product.find()
        .then((result) => {
            let num = 1;
            res.render('admin/products', { result, num });
        })
        .catch((err) => {
            console.log(err.message);
        })
}

exports.addProductPage = (req, res) => {
    Category.find()
        .then((categories) => {
            if(req.query.edit) {
                Product.findOne({ _id : req.query.id })
                    .then((product) => {
                        res.render('admin/addProduct', { categories, product })
                    })
                    .catch((err) => {
                        console.log(err.message);
                    })
            }else
                res.render('admin/addProduct', { categories, product : '' })
        })
        .catch((err) => {
            console.log(err.message);
        })
}

exports.categoryManagement = (req, res) => {
    Category.find()
        .then((categories) => {
            if (req.query.edit) {
                let category = {
                    type: true,
                    id: categories[+req.query.index]._id,
                    name: categories[+req.query.index].category
                }
                res.render('admin/categoryManagement', { category, categories, validation })
                validation.categoryExists = false;

            } else {
                res.render('admin/categoryManagement', { category: { name: "" }, categories, validation })
                validation.categoryExists = false;
            }
        })
        .catch((err) => {
            console.log(err.message);
        })
}

exports.couponManagement = (req, res) => {
    validateCoupon()
        .then(() => {
            Coupon.find()
                .then((coupons) => {
                    if (req.query.edit) {
                        let coupon = {
                            type: true,
                            id: coupons[+req.query.index]._id,
                            couponCode: coupons[+req.query.index].couponCode,
                            couponValue: coupons[+req.query.index].couponValue,
                            minBill: coupons[+req.query.index].minBill,
                            couponExpiry: coupons[+req.query.index].couponExpiry
                        }

                        res.render('admin/coupon', { coupon, coupons, validation })
                        validation.couponExists = false;

                    } else {
                        res.render('admin/coupon', { coupon: { type: false }, coupons, validation })
                        validation.couponExists = false;
                    }
                })
                .catch((err) => {
                    console.log(err.message);
                })
        })
        .catch((err) => {
            console.log(err.message);
        })
}

exports.downloadReport = (req, res) => {
    let num = 1;
    Order.find({ "items.orderStatus" : "Delivered" })
        .then((orders) => {
            res.render('admin/report', { orders, num })
        })
        .catch((err) => {
            console.log(err.message);
        })
}

exports.exportExcel = (req, res) => {
    Order.find()
        .then((SalesReport) => {


            console.log(SalesReport)
            try {
                const workbook = new excelJs.Workbook();

                const worksheet = workbook.addWorksheet("Sales Report");

                worksheet.columns = [
                    { header: "S no.", key: "s_no" },
                    { header: "OrderID", key: "_id" },
                    { header: "Date", key: "orderDate" },
                    { header: "Products", key: "productName" },
                    { header: "Method", key: "paymentMethod" },
                    //     { header: "status", key: "status" },
                    { header: "Amount", key: "orderBill" },
                ];
                let counter = 1;
                SalesReport.forEach((report) => {
                    report.s_no = counter;
                    report.productName = "";
                    // report.name = report.userid;
                    report.items.forEach((eachproduct) => {
                        report.productName += eachproduct.productName + ", ";
                    });
                    worksheet.addRow(report);
                    counter++;
                });

                worksheet.getRow(1).eachCell((cell) => {
                    cell.font = { bold: true };
                });


                res.header(
                    "Content-Type",
                    "application/vnd.oppenxmlformats-officedocument.spreadsheatml.sheet"
                );
                res.header("Content-Disposition", "attachment; filename=report.xlsx");

                workbook.xlsx.write(res);
            } catch (err) {
                console.log(err.message);
            }
        })
        .catch((err) => {
            console.log(err.message);
        })

}

exports.orderManagement = (req, res) => {
    Order.find()
        .then((orders) => {
            res.render('admin/orders', { orders })
        })
        .catch((err) => {
            console.log(err.message);
        })
}

exports.editOrderStatus = (req, res) => {
    Order.findOne({ _id: req.query.id })
        .then((order) => {
            if (order) {
                res.render('admin/editOrderStatus', { order })
            }
        })
        .catch((err) => {
            console.log(err.message);
        })
}



//post 


exports.sendOtp = (req, res) => {
    User.findOne({ mobile: req.body.mobile })
        .then((result) => {
            if (result) {
                if (result.blockStatus) {
                    res.redirect('/mobile_verification?block=true')
                } else {
                    req.session.mobileNumber = req.body.mobile
                    otp.sendOtp(req.body.mobile)
                    res.redirect('/mobile_verification/otp')
                }
            } else {
                res.redirect('/mobile_verification?mobile=false');
            }
        })
        .catch((err) => {
            console.log(err.message);
        })
}

exports.verifyOtp = (req, res) => {
    let otpObject = req.body
    otp.veriOtp(otpObject.otp, req.session.mobileNumber)
        .then((verify) => {
            if (verify) {
                User.findOne({ mobile: req.session.mobileNumber })
                    .then((result) => {
                        req.session.userId = result.email;
                        req.session.otpLogin = true;
                        res.redirect('/user_home')
                    })
                    .catch((err) => {
                        console.log(err);
                    })
            } else
                res.redirect('/mobile_verification/otp?otp=false')
        })
        .catch((err) => {
            console.log(err);
        })


}

exports.signUp = (req, res) => {
    if (req.body.password === req.body.confirmPassword) {
        let userEmail = req.body.email
        User.findOne({ email: userEmail })
            .then((result) => {
                if (result) {
                    res.redirect('/user_registration?userExists=true');
                } else {
                    const userData = new User(req.body)
                    userData.blockStatus = false;
                    userData.save()
                        .then(() => {
                            res.redirect('/user_signin')
                        })
                        .catch((err) => {
                            console.log(err);
                        })
                }
            })
            .catch((err) => {
                console.log(err);
            })
    } else
        res.redirect('/user_registration?passwordMatch=false')
}



exports.login = (req, res) => {
    const loginData = req.body
    User.findOne({ email: loginData.email, password: loginData.password, blockStatus: false })
        .then((result) => {
            if (result) {
                session = req.session
                session.userId = loginData.email;
                res.redirect('/user_home');
            } else {
                User.findOne({ email: loginData.email })
                    .then((result) => {
                        if (result) {
                            if (result.blockStatus) {
                                res.redirect('/user_signin?block=true');
                            } else
                                res.redirect('/user_signin?pass=false');
                        } else {
                            res.redirect('/user_signin?register=false');
                        }
                    })
                    .catch((err) => {
                        console.log(err.message);
                    })
            }
        })
        .catch((err) => console.log(err))
}

exports.addToCart = (req, res) => {
    let session = req.session
    let user = session.userId
    Cart.findOne({ owner: user })
        .then((result) => {
            if (result) {
                Cart.findOne({ owner: req.session.userId, "items.itemId": req.query.id })
                    .then((oldCart) => {
                        if (oldCart) {
                            let cart = new CartProduct(oldCart)
                            let cartItem = cart.add(req.query.id)
                            cartItem.then((cartItem) => {
                                let newCart = oldCart;
                                let indexOfOldItem = 0;
                                for (let i = 0; i < newCart.items.length; i++) {
                                    if (req.query.id.includes(newCart.items[i].itemId)) {
                                        indexOfOldItem = i;
                                        break;
                                    }
                                }
                                newCart.items.splice(indexOfOldItem, 1, cartItem[0]);
                                Cart.replaceOne({ owner: oldCart.owner }, {
                                    owner: newCart.owner,
                                    items: newCart.items,
                                    bill: cart.bill
                                })
                                    .then(() => {
                                        if (req.query.productView)
                                            res.redirect(`/user-home/product?id=${req.query.id}`)
                                        else if (req.query.wishlist) {
                                            Wishlist.deleteOne({ owner : req.session.userId, "items.itemId" : req.query.id })
                                                .then(() => {
                                                    res.redirect('/wishlist')
                                                })
                                                .catch((err) => {
                                                    console.log(err.message);
                                                })
                                        } else
                                            res.redirect('/user_home')
                                    })
                                    .catch((err) => {
                                        console.log(err.message);
                                    })

                            })
                            .catch((err) => {
                                console.log(err.message);
                            })
                        } else {
                            Product.findOne({ _id: req.query.id })
                                .then((product) => {
                                    let newCartItem = {
                                        itemId: product._id,
                                        productName: product.productName,
                                        quantity: 1,
                                        price: product.discountedPrice,
                                        category: product.category,
                                        image1: product.image1
                                    }
                                    let newCart = result;
                                    newCart.items.push(newCartItem)
                                    totalBill = +newCart.bill + +newCartItem.price
                                    newCart.bill = totalBill;
                                    Cart.replaceOne({ owner: user }, {
                                        owner: newCart.owner,
                                        items: newCart.items,
                                        bill: newCart.bill
                                    })
                                        .then(() => {
                                            if (req.query.productView)
                                                res.redirect(`/user-home/product?id=${req.query.id}`)
                                            else if (req.query.wishlist) {
                                                Wishlist.deleteOne({ owner : req.session.userId, "items.itemId" : req.query.id })
                                                .then(() => {
                                                    res.redirect('/wishlist')
                                                })
                                                .catch((err) => {
                                                    console.log(err.message);
                                                })
                                            } else
                                                res.redirect('/user_home');
                                        })
                                        .catch((err) => {
                                            console.log(err.message);
                                        })
                                })
                                .catch((err) => {
                                    console.log(err.message);
                                })
                        }
                    })
                    .catch((err) => {
                        console.log(err.message);
                    })
            } else {
                Product.findOne({ _id: req.query.id })
                    .then((product) => {
                        console.log(product);
                        let cart = new Cart({
                            owner: user,
                            items: [{
                                itemId: product._id,
                                productName: product.productName,
                                quantity: 1,
                                price: product.discountedPrice,
                                category: product.category,
                                image1: product.image1
                            }]
                        })
                        cart.bill = cart.items[0].quantity * cart.items[0].price
                        cart.save()
                            .then(() => {
                                if (req.query.productView)
                                    res.redirect(`/user-home/product?id=${req.query.id}`)
                                else if (req.query.wishlist) {
                                    res.redirect('/wishlist')
                                } else
                                    res.redirect('/user_home');
                            })
                            .catch((err) => {
                                console.log(err.message);
                            })
                    })
                    .catch((err) => {
                        console.log(err.message);
                    })
            }
        })
        .catch((err) => {
            console.log(err.message);
        })
}

exports.cartOperation = (req, res) => {

    Cart.findOne({ owner: req.session.userId })
        .then((oldCart) => {

            let operations = (cartItem) => {
                let newCart = oldCart
                let indexOfOldItem = 0;
                for (let i = 0; i < newCart.items.length; i++) {
                    if (req.query.id.includes(newCart.items[i].itemId)) {
                        indexOfOldItem = i;
                        break;
                    }
                }
                if (cartItem[0].quantity > 0) {
                    newCart.items.splice(indexOfOldItem, 1, cartItem[0]);
                    Cart.replaceOne({ owner: oldCart.owner }, {
                        owner: newCart.owner,
                        items: newCart.items,
                        bill: cart.bill
                    })
                        .then(() => {
                            res.redirect('/cart');
                        })
                        .catch((err) => {
                            console.log(err.message);
                        })
                } else {
                    newCart.items.splice(indexOfOldItem, 1);
                    Cart.replaceOne({ owner: oldCart.owner }, {
                        owner: newCart.owner,
                        items: newCart.items,
                        bill: cart.bill
                    })
                        .then(() => {
                            Cart.findOne({ owner: oldCart.owner })
                                .then((result) => {
                                    if (result.items.length < 1) {
                                        Cart.deleteOne({ owner: oldCart.owner })
                                            .then(() => {
                                                res.redirect('/cart');
                                            })
                                            .catch((err) => {
                                                console.log(err.message);
                                            })
                                    } else {
                                        res.redirect('/cart');
                                    }
                                })
                                .catch((err) => {
                                    console.log(err.message);
                                })
                        })
                        .catch((err) => {
                            console.log(err.message);
                        })
                }
            }

            let cart = new CartProduct(oldCart)
            if (req.query.add) {
                let cartItem = cart.add(req.query.id)
                cartItem.then((cartItem) => {
                    operations(cartItem);
                })
                .catch((err) => {
                    console.log(err.message);
                })
            } else {
                let cartItem = cart.subtract(req.query.id)
                cartItem.then((cartItem) => {
                    operations(cartItem);
                })
                .catch((err) => {
                    console.log(err.message);
                })
            }
        })
        .catch((err) => {
            console.log(err.message);
        })
}




exports.deleteFromCart = (req, res) => {
    Cart.findOne({ owner: req.session.userId })
        .then((result) => {
            let indexOfOldItem = 0;
            for (let i = 0; i < result.items.length; i++) {
                if (req.query.id.includes(result.items[i].itemId)) {
                    indexOfOldItem = i;
                    break;
                }
            }
            let cartBill = +result.bill - +result.items[indexOfOldItem].price
            result.items.splice(indexOfOldItem, 1);
            Cart.replaceOne({ owner: result.owner }, {
                owner: result.owner,
                items: result.items,
                bill: cartBill
            })
                .then(() => {
                    Cart.findOne({ owner: req.session.userId })
                        .then((result) => {
                            if (result.items.length < 1) {
                                Cart.deleteOne({ owner: req.session.userId })
                                    .then(() => {
                                        res.redirect('/cart');
                                    })
                                    .catch((err) => {
                                        console.log(err.message);
                                    })
                            } else {
                                res.redirect('/cart');
                            }
                        })
                        .catch((err) => {
                            console.log(err.message);
                        })
                })
                .catch((err) => {
                    console.log(err.message);
                })
        })
        .catch((err) => {
            console.log(err.message);
        })
}

exports.addToWishlist = (req, res) => {
    Wishlist.findOne({ owner: req.session.userId })
        .then((wishlist) => {
            if (wishlist) {
                Wishlist.findOne({ owner: req.session.userId, "items.itemId": req.query.id })
                    .then((itemExists) => {
                        if (itemExists) {
                            const oldItem = itemExists;
                            let indexOfOldItem = 0;
                            itemExists.items.forEach((item, index) => {
                                if (item.itemId == req.query.id) {
                                    indexOfOldItem = index;
                                }
                            })
                            oldItem.items.splice(indexOfOldItem, 1);
                            if (oldItem.items.length < 1) {
                                Wishlist.deleteOne({ owner: req.session.userId })
                                    .then(() => {
                                        if (req.query.wishlist)
                                            res.redirect('/wishlist');
                                        else
                                            res.redirect('/user_home')
                                    })
                                    .catch((err) => {
                                        console.log(err.message);
                                    })
                            } else {
                                Wishlist.updateOne({ owner: req.session.userId }, { $set: { items: oldItem.items } })
                                    .then(() => {
                                        if (req.query.wishlist)
                                            res.redirect('/wishlist')
                                        else
                                            res.redirect('/user_home')
                                    })
                                    .catch((err) => {
                                        console.log(err.message);
                                    })
                            }

                        } else {
                            Product.findOne({ _id: req.query.id })
                                .then((product) => {
                                    const newWishlistItem = {
                                        itemId: product._id,
                                        productName: product.productName,
                                        category: product.category,
                                        image1: product.image1
                                    }
                                    let newWishlist = wishlist
                                    newWishlist.items.push(newWishlistItem);
                                    Wishlist.updateOne({ owner: req.session.userId }, { $set: { items: newWishlist.items } })
                                        .then(() => {
                                            if (req.query.wishlist)
                                                res.redirect('/wishlist')
                                            else
                                                res.redirect('/user_home')
                                        })
                                        .catch((err) => {
                                            console.log(err.message);
                                        })
                                })
                                .catch((err) => {
                                    console.log(err.message);
                                })
                        }
                    })
                    .catch((err) => {
                        console.log(err.message);
                    })
            } else {
                Product.findOne({ _id: req.query.id })
                    .then((product) => {
                        const wishlist = new Wishlist({
                            owner: req.session.userId,
                            items: [{
                                itemId: product._id,
                                productName: product.productName,
                                category: product.category,
                                image1: product.image1
                            }]
                        })
                        wishlist.save()
                            .then(() => {
                                res.redirect('/user_home')
                            })
                            .catch((err) => {
                                console.log(err.message);
                            })
                    })
                    .catch((err) => {
                        console.log(err.message);
                    })
            }
        })
        .catch((err) => {
            console.log(err.message);
        })
}

exports.applyCoupon = (req, res) => {
    validateCoupon()
        .then(() => {
            const appliedCoupon = req.body.coupon.toUpperCase();
            const currUser = req.session.userId;
            Coupon.find({ status: 'Active', couponCode: appliedCoupon })
                .then((coupon) => {
                    Cart.findOne({ owner: req.session.userId })
                        .then((cart) => {
                            if (coupon.length > 0) {
                                if (cart.bill >= coupon[0].minBill) {
                                    let isAppliedUser = coupon[0].users.some((user) => {
                                        return currUser.includes(user);
                                    })
                                    if (isAppliedUser) {
                                        res.json({ appliedUser: true, cartBill: cart.bill })
                                    } else {

                                        Coupon.findOne({ couponCode: appliedCoupon })
                                            .then((selectedCoupon) => {
                                                req.session.coupon = selectedCoupon;
                                                res.json({ couponValue: selectedCoupon.couponValue, couponCode: selectedCoupon.couponCode, cartBill: cart.bill });
                                            })
                                            .catch((err) => {
                                                console.log(err.message);
                                            })
                                    }
                                } else {
                                    res.json({ insufficientCartValue: true, cartBill: cart.bill })
                                }

                            } else {
                                Coupon.find({ status: 'Expired', couponCode: appliedCoupon })
                                    .then((expiredCoupon) => {
                                        if (expiredCoupon.length > 0) {
                                            res.json({ expiredCoupon: true, cartBill: cart.bill })
                                        } else {
                                            res.json({ invalidCoupon: true, cartBill: cart.bill })
                                        }
                                    })
                                    .catch((err) => {
                                        console.log(err.message);
                                    })
                            }
                        })
                        .catch((err) => {
                            console.log(err.message);
                        })

                })
                .catch((err) => {
                    console.log(err.message);
                })
        })
        .catch((err) => {
            console.log(err.message);
        })

}

exports.shipping = (req, res) => {
    if(req.query.profile) {
        User.findOne({ email: req.session.userId })
            .then((user) => {
                if (user.address) {
                    let updatedUser = user;
                    // updatedUser.address.push()
                    updatedUser.address.splice(1, 1, {
                        name: req.body.name,
                        mobile: req.body.mobile,
                        address1: req.body.address1,
                        address2: req.body.address2,
                        city: req.body.city,
                        state: req.body.state,
                        zip: req.body.zip
                    })
                    User.replaceOne({ email: req.session.userId }, updatedUser)
                        .then(() => {
                            res.redirect('/myAccount')
                        })
                        .catch((err) => {
                            console.log(err.message);
                        })
                }
            })
            .catch((err) => {
                console.log(err.message);
            })
                    
    }else if (req.body.save) {
        User.findOne({ email: req.session.userId })
            .then((user) => {
                if (user.address) {
                    let updatedUser = user;
                    // updatedUser.address.push()
                    updatedUser.address.splice(1, 1, {
                        name: req.body.name,
                        mobile: req.body.mobile,
                        address1: req.body.address1,
                        address2: req.body.address2,
                        city: req.body.city,
                        state: req.body.state,
                        zip: req.body.zip
                    })
                    User.replaceOne({ email: req.session.userId }, updatedUser)
                        .then(() => {
                            res.redirect('/cart/checkout')
                        })
                        .catch((err) => {
                            console.log(err.message);
                        })
                } else {
                    let updatedUser = user;
                    updatedUser.address = [{
                        name: req.body.name,
                        mobile: req.body.mobile,
                        address1: req.body.address1,
                        address2: req.body.address2,
                        city: req.body.city,
                        state: req.body.state,
                        zip: req.body.zip
                    }]
                    User.replaceOne({ email: req.session.userId }, updatedUser)
                        .then(() => {
                            res.send("updated");
                        })
                        .catch((err) => {
                            console.log(err.message);
                        })
                }

            })
            .catch((err) => {
                console.log(err.message);
            })
    } else {
        let anonymousAddress = {
            name: req.body.name,
            mobile: req.body.mobile,
            address1: req.body.address1,
            address2: req.body.address2,
            city: req.body.city,
            state: req.body.state,
            zip: req.body.zip
        }
        req.session.anonymousAddress = anonymousAddress
        res.redirect('/payment')
    }
}

exports.payment = (req, res) => {
    res.redirect(`/payment?index=${req.body.selectedAddressIndex}`)
}

exports.paymentMode = (req, res) => {

    function createOrder(cart, paymentMode, orderBill) {
        const newOrder = {
            owner: cart.owner,
            items: cart.items,
            address: cart.address,
            paymentMode: paymentMode,
            cartValue: cart.bill,
            couponCode: req.session.coupon.couponCode || '',
            couponValue: req.session.coupon.couponValue || '',
            orderBill: orderBill,
            orderDate: Date()
        }
        req.session.order = newOrder;
    }

    Cart.findOne({ owner: req.session.userId })
        .then((cart) => {
            const orderBill = req.body.orderBill || cart.bill
            const paymentMode = req.body.radio;
            if (paymentMode === "COD") {
                createOrder(cart, paymentMode, orderBill)
                res.json({ codSuccess: true })

            } else if (paymentMode === "paypal") {
                createOrder(cart, paymentMode, orderBill)
                res.json({ paypal: true });

            } else {
                createOrder(cart, paymentMode, orderBill)
                res.redirect('/razorpay');
            }
        })
        .catch((err) => {
            console.log(err.message);
        })
}

exports.cancelOrder = (req, res) => {
    Order.updateOne({ _id: req.query.orderId }, { $set: { "items.$[elem].orderStatus": "Cancelled" } }, { arrayFilters: [{ "elem._id": req.query.itemId }] })
        .then(() => {
            res.redirect(`/order-status?id=${req.query.orderId}`)
        })
        .catch((err) => {
            console.log(err.message);
        })
}

exports.returnOrder = (req, res) => {
    Order.updateOne({ _id: req.query.orderId }, { $set: { "items.$[elem].orderStatus": "Return initiated" } }, { arrayFilters: [{ "elem._id": req.query.itemId }] })
        .then(() => {
            res.redirect(`/order-status?id=${req.query.orderId}`)
        })
        .catch((err) => {
            console.log(err.message);
        })
}

exports.adminSignin = (req, res) => {
    const adminData = req.body
    Admin.findOne({ username: adminData.username, password: adminData.password })
        .then((result) => {
            if (result) {
                session = req.session
                session.adminId = adminData.username
                res.redirect('/admin_panel/dashboard')
            } else {
                Admin.findOne({ username: adminData.username })
                    .then((result) => {
                        if (result) {
                            res.redirect('/admin_login?pass=false')
                        } else
                            res.redirect('/admin_login?register=false');
                    })
                    .catch((err) => {
                        console.log(err.message);
                    })
            }
        })
        .catch((err) => {
            console.log(err.message);
        })
}

exports.userBlock = (req, res) => {
    let blockId = req.query.id;
    User.updateOne({ _id: ObjectID(blockId) }, { $set: { blockStatus: true } })
        .then(() => {
            req.session.userId = "";
            res.redirect('/admin_panel/user_management');
        })
        .catch((err) => console.log(err))
}

exports.userUnblock = (req, res) => {
    let blockId = req.query.id;
    User.updateOne({ _id: ObjectID(blockId) }, { $set: { blockStatus: false } })
        .then(() => {
            res.redirect('/admin_panel/user_management');
        })
        .catch((err) => console.log(err));
}

exports.addProduct = (req, res, next) => {
    const files = req.files;
    if (!files) {
        const error = new Error('please choose file')
        error.httpStatusCode = 400
        return next(error)
    }

    let productDetail = new Product({
        productName: req.body.productName,
        actualPrice: req.body.actualPrice,
        discountedPrice: req.body.discountedPrice,
        description: req.body.description,
        stock: req.body.stock,
        category: req.body.category,
        subCategory: req.body.subCategory,
        image1: req.files[0] && req.files[0].filename ? req.files[0].filename : "",
        image2: req.files[1] && req.files[1].filename ? req.files[1].filename : ""
    })

    return productDetail.save()
        .then(() => {
            res.redirect('/admin_panel/product_management/add_product')
        })
        .catch((err) => console.log(err))
}

exports.editProduct = (req, res) => {
    if(req.files[0] && req.files[0].filename && req.files[1] && req.files[1].filename ) {
        const updatedProduct = {
            productName : req.body.productName,
            actualPrice : req.body.actualPrice,
            discountedPrice : req.body.discountedPrice,
            description : req.body.description,
            stock : req.body.stock,
            category : req.body.category,
            image1: req.files[0] && req.files[0].filename ? req.files[0].filename : "",
            image2: req.files[1] && req.files[1].filename ? req.files[1].filename : ""
        }
        replaceProduct(req.query.id, updatedProduct)
            .then(() => {
                res.redirect('/admin_panel/product_management')
            })
            .catch((err) => {
                console.log(err.message);
            })

    }else{
        console.log("in-else")
        const updatedProduct = {
            productName : req.body.productName,
            actualPrice : req.body.actualPrice,
            discountedPrice : req.body.discountedPrice,
            description : req.body.description,
            stock : req.body.stock,
            category : req.body.category
        }
        updateProduct(req.query.id, updatedProduct)
            .then(() => {
                res.redirect('/admin_panel/product_management')
            })
            .catch((err) => {
                console.log(err.message);
            })
    }
}

exports.deleteProduct = (req, res) => {
    Product.deleteOne({ _id: req.query.id })
        .then(() => {
            res.redirect('/admin_panel/product_management')
        })
        .catch((err) => {
            console.log(err.message);
        })
}

exports.editStatus = (req, res) => {
    if (req.query.approve) {
        Order.updateOne({ _id: req.query.orderId }, { $set: { "items.$[elem].orderStatus": "Approved" } }, { arrayFilters: [{ "elem._id": req.query.itemId }] })
            .then(() => {
                res.redirect(`/admin_panel/order_management/edit-order-status?id=${req.query.orderId}`)
            })
            .catch((err) => {
                console.log(err.message);
            })

    } else if (req.query.deny) {
        Order.updateOne({ _id: req.query.orderId }, { $set: { "items.$[elem].orderStatus": "Cancelled" } }, { arrayFilters: [{ "elem._id": req.query.itemId }] })
            .then(() => {
                res.redirect(`/admin_panel/order_management/edit-order-status?id=${req.query.orderId}`)
            })
            .catch((err) => {
                console.log(err.message);
            })
    } else if (req.query.shipped) {
        Order.updateOne({ _id: req.query.orderId }, { $set: { "items.$[elem].orderStatus": "Shipped" } }, { arrayFilters: [{ "elem._id": req.query.itemId }] })
            .then(() => {
                res.redirect(`/admin_panel/order_management/edit-order-status?id=${req.query.orderId}`)
            })
            .catch((err) => {
                console.log(err.message);
            })
    } else if (req.query.delivered) {
        Order.updateOne({ _id: req.query.orderId }, { $set: { "items.$[elem].orderStatus": "Delivered" } }, { arrayFilters: [{ "elem._id": req.query.itemId }] })
            .then(() => {
                res.redirect(`/admin_panel/order_management/edit-order-status?id=${req.query.orderId}`)
            })
            .catch((err) => {
                console.log(err.message);
            })
    }
}

exports.addNewCategory = (req, res) => {
    Category.findOne({ category: req.body.category })
        .then((category) => {
            if (category) {
                validation.categoryExists = true;
                res.redirect('/admin-panel/category-management')
            } else {
                const newCategory = new Category({
                    category: req.body.category
                })
                newCategory.save()
                    .then(() => {
                        res.redirect('/admin-panel/category-management')
                    })
                    .catch((err) => {
                        console.log(err.message);
                    })
            }
        })
        .catch((err) => {
            console.log(err.message);
        })
}

exports.updateCategory = (req, res) => {
    Category.findOne({ _id: req.query.id })
        .then((category) => {
            let body = req.body.category;
            if (category.category === body) {
                validation.categoryExists = true;
                res.redirect('/admin-panel/category-management')
            } else {
                Category.updateOne({ _id: req.query.id }, { $set: { category: req.body.category } })
                    .then(() => {
                        res.redirect('/admin-panel/category-management')
                    })
                    .catch((err) => {
                        console.log(err.message);
                    })
            }
        })
        .catch((err) => {
            console.log(err.message);
        })
}

exports.deleteCategory = (req, res) => {
    Category.deleteOne({ _id: req.query.id })
        .then(() => {
            res.redirect('/admin-panel/category-management');
        })
        .catch((err) => {
            console.log(err.message);
        })
}

exports.addCoupon = (req, res) => {
    const newCoupon = new Coupon({
        couponCode: req.body.couponCode,
        couponValue: req.body.couponValue,
        minBill: req.body.minBill,
        couponExpiry: req.body.couponExpiry
    })
    newCoupon.save()
        .then(() => {
            res.redirect('/admin-panel/coupon-management');
        })
        .catch((err) => {
            console.log(err.message);
        })
}

exports.updateCoupon = (req, res) => {
    Coupon.findOne({ _id: ObjectID(req.query.id) })
        .then((coupon) => {
            const newCoupon = {
                couponCode: req.body.couponCode,
                couponValue: +req.body.couponValue,
                minBill: +req.body.minBill,
                couponExpiry: req.body.couponExpiry
            }
            Coupon.replaceOne({ _id: req.query.id }, newCoupon)
                .then(() => {
                    res.redirect('/admin-panel/coupon-management')
                })
                .catch((err) => {
                    console.log(err.message);
                })
        })
        .catch((err) => {
            console.log(err.message);
        })
}

exports.deleteCoupon = (req, res) => {
    Coupon.deleteOne({ _id: req.query.id })
        .then(() => {
            res.redirect('/admin-panel/coupon-management');
        })
        .catch((err) => {
            console.log(err.message);
        })
}

exports.test = (req, res) => {

    const months = [
        january = [],
        february = [],
        march = [],
        april = [],
        may = [],
        june = [],
        july = [],
        august = [],
        september = [],
        october = [],
        november = [],
        december = []
    ]
    
    const quarters = [
        Q1 = [],
        Q2 = [],
        Q3 = [],
        Q4 = []
    ]

    const monthNum = [ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12 ]

    Order.find({ "items.orderStatus" : "Delivered" })
        .then((orders) => {
            monthNum.forEach((month, monthIndex) => {
                orders.forEach((order, index) => {
                    if(order.orderDate.getMonth()+1 == monthIndex+1 ) {
                        months[monthIndex].push(order);
                    }
                })
            })
 
            orders.forEach((order) => {
                if(order.orderDate.getMonth()+1 <= 3){
                    quarters[0].push(order)
                }else if(order.orderDate.getMonth()+1 > 3 && order.orderDate.getMonth()+1 <= 6){
                    quarters[1].push(order)
                }else if(order.orderDate.getMonth()+1 > 6 && order.orderDate.getMonth()+1 <= 9){
                    quarters[2].push(order)
                }else if(order.orderDate.getMonth()+1 >9 && order.orderDate.getMonth()+1 <= 12){
                    quarters[3].push(order)
                }
            })
            
            const monthlySalesTurnover = [];
            const quarterlySalesTurnover = [];
            months.forEach((month) => {
                let eachMonthTurnover = month.reduce((acc, curr) => {
                    acc += +curr.orderBill;
                    return acc;
                }, 0)
                monthlySalesTurnover.push(eachMonthTurnover);
            })

            quarters.forEach((quarter) => {
                let eachQuarterTurnover = quarter.reduce((acc, curr) => {
                    acc += curr.orderBill;
                    return acc;
                }, 0)
                quarterlySalesTurnover.push(eachQuarterTurnover)
            })

            let annualSales = orders.reduce((acc, curr) => {
                acc += curr.orderBill
                return acc;
            }, 0)

            res.json({ salesOfTheYear : monthlySalesTurnover, quarterlySales : quarterlySalesTurnover, annualSales : annualSales })
        })
        .catch((err) => {
            console.log(err.message);
        })
}

exports.userLogout = (req, res) => {
    req.session.userId = "";
    req.session.otpLogin = false;
    req.session.mobileNumber = "";
    req.session.anonymousAddress = "";
    res.redirect('/user_signin')
}

exports.adminLogout = (req, res) => {
    req.session.adminId = "";
    res.redirect('/admin_login');
}
