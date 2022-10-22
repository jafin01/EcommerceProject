const express = require('express');
const services = require('../controller/render');
const User = require('../model/userModel');

const router = express.Router();

router.get('/', services.isLoggedOut, services.user)

router.get('/user_signin', services.isLoggedOut, services.userLogin)

router.get('/user_registration', services.userSignup)

router.get('/user_home', services.isLoggedIn, services.userHome)

router.get('/wishlist', services.isLoggedIn, services.wishlist)

router.get('/cart', services.isLoggedIn, services.cart)

router.get('/cart/checkout', services.checkout);

router.get('/cart/checkout/shipping/add-new-address', services.addAddress);

router.get('/payment', services.paymentPage);

router.get('/paypal', services.paypal);

router.get('/razorpay', services.razorpay);

router.get('/order-success-redirect', services.orderSuccess);

router.get('/myAccount', services.isLoggedIn, services.myAccount);

router.get('/all-orders', services.isLoggedIn, services.allOrders);

router.get('/order-status', services.isLoggedIn, services.orderStatus);

router.get('/mobile_verification',services.isLoggedOut, services.mobileVerification)

router.get('/mobile_verification/otp', services.isMobileFound, services.otpPage)

router.get('/user-home/product',services.isLoggedIn, services.productView);

router.post('/user/send-otp', services.sendOtp)

router.post('/user/verify-otp', services.verifyOtp)

router.post('/user_signin', services.login)

router.post('/user_registration', services.signUp)

router.post('/user_home/addToCart', services.isLoggedIn, services.addToCart)

router.post('/addToCart/cart-operation', services.isLoggedIn, services.cartOperation)

router.post('/delete-from-cart', services.isLoggedIn, services.deleteFromCart);

router.post('/add-to-wishlist', services.isLoggedIn, services.addToWishlist);

router.post('/cart/checkout/apply-coupon', services.isLoggedIn, services.applyCoupon);

router.post('/cart/checkout/shipping/add-new-address', services.isLoggedIn, services.shipping);

router.post('/cart/checkout/shipping/edit-address', services.isLoggedIn, services.editAddress);

router.post('/myAccount/change-password', services.isLoggedIn, services.changePassword);

router.post('/payment', services.isLoggedIn, services.payment);

router.post('/payment-mode', services.isLoggedIn, services.paymentMode);

router.post('/cancel-order', services.isLoggedIn, services.cancelOrder);

router.post('/return-order', services.isLoggedIn, services.returnOrder);

router.get('/user_logout', services.isLoggedIn, services.userLogout)

module.exports = router;