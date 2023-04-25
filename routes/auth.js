const express = require('express');

const { check, body } = require("express-validator");

const authController = require('../controllers/auth');
const User = require('../models/user');

const router = express.Router();

router.get('/login', authController.getLogin);

router.get('/signup', authController.getSignup);

router.post('/login', 
[
    check("email").isEmail().withMessage("Please enter a valid email.").custom(async(value,{req})=>{
        const userDoc=await User.findOne({email:value})
        if(!userDoc){
            throw new Error("Email does not exist! Please create a new account.")
        }
        return true;
    }).normalizeEmail(),
    body(
        "password",
        "Please enter a password with only numbers and aplhabets and atleast 5 and max 6 characters."
    )
        .isLength({ min: 5 })
        .isAlphanumeric().trim(),
],authController.postLogin);

router.post(
    "/signup",
    [
        check("email").isEmail().withMessage("Please enter a valid email.").custom(async(value,{req})=>{
            const userDoc=await User.findOne({email:value})
            if(userDoc){
                throw new Error("Email exists already! Please select another one.")
            }
            return true;
        }).normalizeEmail(),
        body(
            "password",
            "Please enter a password with only numbers and aplhabets and atleast 5 characters."
        )
            .trim()
            .isLength({ min: 5, max: 6 })
            .isAlphanumeric(),
        body("confirmPassword").trim().custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error("Passwords do not match!");
            }
            return true;
        }),
    ],
    authController.postSignup
);

router.post('/logout', authController.postLogout);

router.get('/reset', authController.getReset);

router.post('/reset', authController.postReset);

router.get('/reset/:token', authController.getNewPassword);

router.post('/new-password', authController.postNewPassword);

module.exports = router;
