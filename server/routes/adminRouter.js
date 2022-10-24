const express = require('express');
const services = require('../controller/render')

//multer
const store = require('../middlewares/multer')

const router = express.Router();

router.get('/admin_login', services.adminLoggedOut, services.adminLogin)

router.get('/admin_panel/dashboard', services.adminLoggedIn, services.adminPanel);

router.get('/admin_panel/order_management', services.adminLoggedIn, services.orderManagement);

router.get('/admin_panel/order_management/edit-order-status', services.editOrderStatus);

router.get('/admin_panel/product_management', services.adminLoggedIn, services.productManagement);

router.get('/admin_panel/product_management/add_product', services.adminLoggedIn, services.addProductPage);

router.get('/admin-panel/category-management', services.adminLoggedIn, services.categoryManagement);

router.get('/admin_panel/user_management', services.adminLoggedIn, services.userManagement);

router.get('/admin-panel/coupon-management', services.adminLoggedIn, services.couponManagement);

router.get('/admin-panel/dashboard/download-report', services.adminLoggedIn, services.downloadReport);

router.get('/admin/exportExcel',services.exportExcel)

router.post('/admin_panel/users/block', services.userBlock)

router.post('/admin_panel/users/unblock', services.userUnblock)

router.post('/admin_panel/product_management/add_product', store.any(), services.addProduct);

router.post('/admin-panel/product-management/edit-product', services.adminLoggedIn, store.any(), services.editProduct);

router.post('/admin_panel/delete-product', services.deleteProduct);

router.post('/admin_panel/order_management/edit-order-status', services.editStatus);

router.post('/admin-panel/category-management/add-new-category', services.addNewCategory);

router.post('/admin-panel/category-management/update-category', services.updateCategory);

router.post('/admin-panel/category-management/delete-category', services.deleteCategory);

router.post('/admin-panel/coupon-management/add-coupon', services.addCoupon);

router.post('/admin-panel/coupon-management/update-coupon', services.updateCoupon);

router.post('/admin-panel/coupon-management/delete-coupon', services.deleteCoupon);

router.post('/test', services.test);

router.post('/admin_login', services.adminSignin)

router.get('/admin_logout', services.adminLogout);



module.exports = router;