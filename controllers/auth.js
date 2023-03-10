const crypro=require("crypto")

const nodemailer=require("nodemailer")
const bcrypt=require("bcryptjs")
const { validationResult } = require("express-validator");

const User = require('../models/user');

let transporter = nodemailer.createTransport({
  host: "smtp.mandrillapp.com",
  port: 587,
  secure: false, 
  auth: {
    user: "hiteshmodi624@gmail.com",
    pass:process.env.NODEMAILER,
  },
});

exports.getLogin = (req, res, next) => {
  let message=req.flash('error');
  if(message.length>0)
    message=message[0];
  else
    message=null;
  res.render('auth/login', {
    path: '/login',
    pageTitle: 'Login',
    errorMessage:message,
    oldInput: { email:"", password:"" },
    validationErrors:[]
  });
};

exports.postLogin = async(req, res, next) => {
  const email=req.body.email;
  const password=req.body.password;
  const errors=validationResult(req);
  if(!errors.isEmpty()){
    return res.status(422).render("auth/login", {
        path: "/login",
        pageTitle: "Login",
        isAuthenticated: false,
        errorMessage: errors.array()[0].msg,
        oldInput: { email, password },
        validationErrors:errors.array()
    });
  }
  try {
    const user=await User.findOne({email})  
    const doMatch=await bcrypt.compare(password,user.password)
    if(doMatch){
      req.session.isLoggedIn = true;
      req.session.user = user;
      req.session.save(err => {
        console.log(err);
        res.redirect('/');
      });
    }
    else{
      await req.flash("error","Invalid email or password.")
      res.redirect("/login")
    }
  }
  catch (err) {
    const error=new Error(err);
    error.httpStatusCode=500;
    return next(error);
  }
};

exports.getSignup = (req, res, next) => {
  let message=req.flash('error');
  if(message.length>0)
    message=message[0];
  else
    message=null;
  res.render("auth/signup", {
      path: "/signup",
      pageTitle: "Signup",
      isAuthenticated: false,
      errorMessage: message,
      oldInput: { email: "", password: "", confirmPassword: "" },
      validationErrors:[]
  });
};

exports.postSignup = async(req, res, next) => {
  const email=req.body.email;
  const password=req.body.password;
  const confirmPassword=req.body.confirmPassword;
  const errors=validationResult(req);
  if(!errors.isEmpty()){
    return res.status(422).render('auth/signup', {
      path: '/signup',
      pageTitle: 'Signup',
      isAuthenticated: false,
      errorMessage:errors.array()[0].msg,
      oldInput: { email, password, confirmPassword },
      validationErrors:errors.array()
    });
  }
  try {
      const hashedPassword= await bcrypt.hash(password,12);
      const user=new User({
        email,
        password : hashedPassword,
        cart:{items:[]}
      })
      await user.save();
      res.redirect("/login")
      return transporter.sendMail({
        to:email,
        from:"info@nathead.com",
        subject:"Signup-Succedded",
        html:"<h1>Welcome to Our new shop!</h1>"
      })
  } catch (err) {
    const error=new Error(err);
    error.httpStatusCode=500;
    return next(error);
  }
};

exports.postLogout = (req, res, next) => {
  req.session.destroy(err => {
    console.log(err);
    res.redirect('/');
  });
};


exports.getReset=(req,res,next)=>{
  let message=req.flash('error');
  if(message.length>0)
    message=message[0];
  else
    message=null;
  res.render('auth/reset', {
    path: '/reset',
    pageTitle: 'Reset Password',
    errorMessage:message
  });
}

exports.postReset=(req,res,next)=>{
  crypro.randomBytes(32,async(err,buffer)=>{
    if(err){
      req.flash("error",err);
      return res.redirect("/reset");
    }
    const token=buffer.toString("hex");
    const email=req.body.email;
    try {
      const user= await User.findOne({email})
      if(!user){
        req.flash("error","No account with that email found");
        return res.redirect("/reset");
      }
      user.resetToken=token;
      user.resetTokenExpiration=Date.now()+3600000;
      await user.save();
      res.redirect("/")
      return transporter.sendMail({
        to:email,
        from:"info@nathead.com",
        subject:"Password Reset",
        html:`<p>You requested a password reset.</p>
        <p>Click this <a href="http://localhost:3000/reset/${token}">link</a> to reset your password.<p>`
      })

    } catch (error) {
      req.flash("error",error);
      console.log(error)
      return res.redirect("/reset");
    }
   
  })
}

exports.getNewPassword=async(req,res,next)=>{
  const token=req.params.token;
  try {
    const user=await User.findOne({resetToken:token,resetTokenExpiration:{$gt:Date.now()}});
    if(user){
      let message=req.flash('error');
      if(message.length>0)
        message=message[0];
      else
        message=null;
      res.render('auth/new-password', {
        path: '/new-password',
        pageTitle: 'Set New Password',
        errorMessage:message,
        userId:user._id.toString(),
        passwordToken:token
      });
    }
    else{
      res.redirect("/login")
    }
  } catch (error) {
    console.log(error)
    res.redirect("/login")
  }
}

exports.postNewPassword=(async(req,res,next)=>{
  try {
    const newPassword=req.body.password;
    const userId=req.body.userId;
    const passwordToken=req.body.passwordToken;
    const user=await User.findOne({resetToken:passwordToken,resetTokenExpiration:{$gt:Date.now()},_id:userId});
    const hashedPassword=await bcrypt.hash(newPassword,12);
    user.password=hashedPassword
    user.resetToken=undefined
    user.resetTokenExpiration=undefined
    await user.save();
    res.redirect("/login")
  } catch (err) {
      const error=new Error(err);
      error.httpStatusCode=500;
      return next(error);
  }
})