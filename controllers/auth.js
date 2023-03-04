const bcrypt=require("bcryptjs")
const User = require('../models/user');

exports.getLogin = (req, res, next) => {
  let message=req.flash('error');
  if(message.length>0)
    message=message[0];
  else
    message=null;
  res.render('auth/login', {
    path: '/login',
    pageTitle: 'Login',
    isAuthenticated: false,
    errorMessage:message
  });
};

exports.getSignup = (req, res, next) => {
  let message=req.flash('error');
  if(message.length>0)
    message=message[0];
  else
    message=null;
  res.render('auth/signup', {
    path: '/signup',
    pageTitle: 'Signup',
    isAuthenticated: false,
    errorMessage:message
  });
};

exports.postLogin = async(req, res, next) => {
  const email=req.body.email;
  const password=req.body.password;
  
  try {
    const user=await User.findOne({email})  
    if(!user){
      await req.flash("error","Invalid email or password.")
      res.redirect("/login")
    }
    else{
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
  } catch (error) {
    console.log(error)
  }
  
  
};

exports.postSignup = async(req, res, next) => {
  const email=req.body.email;
  const password=req.body.password;
  const confirmPassword=req.body.confirmPassword;
  try {
    const userDoc=await User.findOne({email:email})
    if(userDoc){
      await req.flash("error","Email exists already! Please select another one.")
      res.redirect("/signup")
    }
    else{
      const hashedPassword= await bcrypt.hash(password,12);
      const user=new User({
        email,
        password : hashedPassword,
        cart:{items:[]}
      })
      await user.save();
      res.redirect("/login")
    }
  } catch (error) {
    console.log(error)
  }
  
};

exports.postLogout = (req, res, next) => {
  req.session.destroy(err => {
    console.log(err);
    res.redirect('/');
  });
};
