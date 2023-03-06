const path = require('path');

const express = require('express');
const { check, body } = require("express-validator");

const adminController = require('../controllers/admin');
const isAuth=require("../middleware/is-auth")

const router = express.Router();

// /admin/add-product => GET
router.get('/add-product', isAuth, adminController.getAddProduct);

// /admin/products => GET
router.get('/products', isAuth, adminController.getProducts);

// /admin/add-product => POST
router.post(
    "/add-product",
    [
        body("title","Please enter a title with atleast 3 characters").isString().isLength({ min: 3 }),
        // body("imageUrl","Please enter a valid URL").isURL(),
        body("price","Please enter a numeric value").isFloat(),
        body("description","Please enter description of length between 5 and 400 characters").isLength({ min: 5, max: 400 }),
    ],
    isAuth,
    adminController.postAddProduct
);

router.get('/edit-product/:productId', isAuth, adminController.getEditProduct);

router.post(
    "/edit-product",
    [
        body("title","Please enter a title with atleast 3 characters").isString().isLength({ min: 3 }),
        // body("imageUrl","Please enter a valid URL").isURL(),
        body("price","Please enter a numeric value").isFloat(),
        body("description","Please enter description of length between 5 and 400 characters").isLength({ min: 5, max: 400 }),
    ],
    isAuth,
    adminController.postEditProduct
);

// router.post('/delete-product', isAuth, adminController.postDeleteProduct);
router.delete('/product/:productId', isAuth, adminController.deleteProduct);

module.exports = router;
