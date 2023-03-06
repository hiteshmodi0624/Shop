const { validationResult }=require("express-validator")

const Product = require('../models/product');
const { deleteFile } = require("../util/file");

exports.getAddProduct = (req, res, next) => {
  res.render('admin/edit-product', {
    pageTitle: 'Add Product',
    path: '/admin/add-product',
    editing: false,
    hasError:false,
    errorMessage:null,
    validationErrors:[]
  });
};

exports.postAddProduct = (req, res, next) => {
  const title = req.body.title;
  // const imageUrl = req.body.imageUrl;
  const image=req.file;
  const price = req.body.price;
  const description = req.body.description;
  const errors=validationResult(req);
  if(!image){
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Add Product',
      path: '/admin/edit-product',
      editing: false,
      hasError:true,
      errorMessage:'Attached File is not an image!',
      product: {
        title,price,description
      },
      validationErrors:[]
    }); 
  }
  if(!errors.isEmpty()){
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Add Product',
      path: '/admin/edit-product',
      editing: false,
      hasError:true,
      errorMessage:errors.array()[0].msg,
      product: {
        title,price,description
      },
      validationErrors:errors.array()
    });
  }
  const imageUrl="/"+image.path;
  const product = new Product({
    title: title,
    price: price,
    description: description,
    imageUrl: imageUrl,
    userId: req.user
  });
  product
    .save()
    .then(result => {
      // console.log(result);
      console.log('Created Product');
      res.redirect('/admin/products');
    })
    .catch(err => {
      const error=new Error(err);
      error.httpStatusCode=500;
      return next(error);
    });
};

exports.getEditProduct = (req, res, next) => {
  const editMode = req.query.edit;
  if (!editMode) {
    return res.redirect('/');
  }
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then(product => {
      if (!product) {
        return res.redirect('/');
      }
      res.render('admin/edit-product', {
        pageTitle: 'Edit Product',
        path: '/admin/edit-product',
        editing: editMode,
        product: product,
        hasError:false,
        errorMessage:null,
        validationErrors:[]
      });
    })
    .catch(err => {
      const error=new Error(err);
      error.httpStatusCode=500;
      return next(error);
    });
};

exports.postEditProduct = (req, res, next) => {
  const prodId = req.body.productId;
  const updatedTitle = req.body.title;
  const updatedPrice = req.body.price;
  const image = req.file;
  const updatedDesc = req.body.description;
  const errors=validationResult(req);
  if(!errors.isEmpty()){
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Edit Product',
      path: '/admin/edit-product',
      editing: true,
      hasError:true,
      errorMessage:errors.array()[0].msg,
      product: {
        title:updatedTitle,price:updatedPrice,description:updatedDesc,_id:prodId
      },
      validationErrors:errors.array()
    });
  }
  Product.findById(prodId)
    .then(product => {
      if(product.userId.toString()!==req.user._id.toString()){
        return res.redirect("/")
      }
      product.title = updatedTitle;
      product.price = updatedPrice;
      product.description = updatedDesc;
      if(image){
        deleteFile(product.imageUrl.substring(1))
        product.imageUrl = "/"+image.path;
      }
      return product.save().then(result => {
        console.log('UPDATED PRODUCT!');
        res.redirect('/admin/products');
      })
    })
    .catch(err => {
      const error=new Error(err);
      error.httpStatusCode=500;
      return next(error);
    });
};

exports.getProducts = (req, res, next) => {
  Product.find({userId:req.session.user._id})
    // .select('title price -_id')
    // .populate('userId', 'name')
    .then(products => {
      res.render('admin/products', {
        prods: products,
        pageTitle: 'Admin Products',
        path: '/admin/products',
      });
    })
    .catch(err => {
      const error=new Error(err);
      error.httpStatusCode=500;
      return next(error);
    });
};

exports.deleteProduct = async(req, res, next) => {
  try {
    const prodId = req.params.productId;
    const product=await Product.findById(prodId)
    if(!product){
      return next(new Error("Product Not Found!"))
    }
    deleteFile(product.imageUrl.substring(1))
    await Product.deleteOne({_id:prodId,userId:req.user._id})
    console.log('DESTROYED PRODUCT');
    res.status(200).json({
      message:"Success!"
    })
  } catch (err) {
    res.status(500).json({
      message:"Deleting product failed!"
    })
  }
};
