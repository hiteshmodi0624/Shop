const fs=require('fs');
const path=require('path');

const stripe=require('stripe')('sk_test_51Mie0ZSBquX0ZYcyO6kiH81W1ztMPsbyP5z6K83QjsEgp3EfXrSfDgn1qBEH5RydaPFy7rkRTYsF13dbkILOPIyh005WE3aXRH');
const PDFDocument=require('pdfkit')

const Product = require('../models/product');
const Order = require('../models/order');

const ITEMS_PER_PAGE=2;

exports.getProducts = async(req, res, next) => {
  const page=+req.query.page || 1;
  const totalProducts=await Product.find().countDocuments();
  Product.find()
    .skip((page-1)*ITEMS_PER_PAGE)
    .limit(ITEMS_PER_PAGE)
    .then(products => {
      res.render('shop/product-list', {
        prods: products,
        pageTitle: 'Products',
        path: '/products',
        currPage:page,
        hasNextPage:ITEMS_PER_PAGE*page<totalProducts,
        hasPreviousPage:page>1,
        nextPage:page+1,
        previousPage:page-1,
        lastPage:Math.ceil(totalProducts/ITEMS_PER_PAGE),
      });
    })
    .catch(err => {
      console.log(err);
    });
};

exports.getProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then(product => {
      res.render('shop/product-detail', {
        product: product,
        pageTitle: product.title,
        path: '/products',
      });
    })
    .catch(err => console.log(err));
};

exports.getIndex = async(req, res, next) => {
  const page=+req.query.page || 1;

  const totalProducts=await Product.find().countDocuments();
  Product.find()
    .skip((page-1)*ITEMS_PER_PAGE)
    .limit(ITEMS_PER_PAGE)
    .then(products => {
      res.render('shop/index', {
        prods: products,
        pageTitle: 'Shop',
        path: '/',
        currPage:page,
        hasNextPage:ITEMS_PER_PAGE*page<totalProducts,
        hasPreviousPage:page>1,
        nextPage:page+1,
        previousPage:page-1,
        lastPage:Math.ceil(totalProducts/ITEMS_PER_PAGE),
      });
    })
    .catch(err => {
      console.log(err);
    });
};

exports.getCart = (req, res, next) => {
  req.user
    .populate('cart.items.productId')
    .then(user => {
      const products = user.cart.items;
      res.render('shop/cart', {
        path: '/cart',
        pageTitle: 'Your Cart',
        products: products,
      });
    })
    .catch(err => console.log(err));
};

exports.postCart = (req, res, next) => {
  const prodId = req.body.productId;
  Product.findById(prodId)
    .then(product => {
      return req.user.addToCart(product);
    })
    .then(result => {
      res.redirect('/cart');
    });
};

exports.postCartDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  req.user
    .removeFromCart(prodId)
    .then(result => {
      res.redirect('/cart');
    })
    .catch(err => console.log(err));
};

exports.getCheckout=async(req,res,next)=>{
  
  try {
    const user=await req.user.populate('cart.items.productId')
    const products = await user.cart.items;
    const totalSum = products.reduce((total,product)=>{
      return total+product.quantity*product.productId.price
    },0)
    const session=await stripe.checkout.sessions.create({
      payment_method_types:['card'],
      line_items:products.map(p=>{
        return {
          price_data:{
            currency:'inr',
            unit_amount:p.productId.price*100,
            product_data:{
              name:p.productId.title,
              description:p.productId.description,
            }
          },
          quantity:p.quantity
        };
      }),
      mode: 'payment',
      success_url:req.protocol+'://'+req.get('host')+'/'+'checkout/success',
      cancel_url:req.protocol+'://'+req.get('host')+'/'+'checkout/cancel',
    })
    res.render('shop/checkout', {
      path: '/cart',
      pageTitle: 'Checkout',
      products: products,
      totalSum,
      sessionId:session.id
    });
  } catch (error) {
    console.log(error)
    next(new Error(error));
  }
  
    
}
exports.getCheckoutSuccess = (req, res, next) => {
  req.user
    .populate('cart.items.productId')
    .then(user => {
      const products = user.cart.items.map(i => {
        return { quantity: i.quantity, product: { ...i.productId._doc } };
      });
      const order = new Order({
        user: {
          email: req.user.email,
          userId: req.user
        },
        products: products
      });
      return order.save();
    })
    .then(result => {
      return req.user.clearCart();
    })
    .then(() => {
      res.redirect('/orders');
    })
    .catch(err => console.log(err));
};

exports.getOrders = (req, res, next) => {
  Order.find({ 'user.userId': req.user._id })
    .then(orders => {
      res.render('shop/orders', {
        path: '/orders',
        pageTitle: 'Your Orders',
        orders: orders,
      });
    })
    .catch(err => console.log(err));
};

exports.getInvoice= async(req,res,next)=>{
  const orderId=req.params.orderId;
  try {
    const order=await Order.findById(orderId);  
    if(!order)
      return next(new Error("No Order found"))
    if(order.user.userId.toString()!==req.user._id.toString())
      return next(new Error("Unauthorised"))
    const invoiceName="invoice-"+orderId+".pdf";
    const invoicePath=path.join('data','invoices',invoiceName);
    const pdfDoc=new PDFDocument();
    res.setHeader('Content-Type',"application/pdf");
    res.setHeader('Content-Disposition','inline;filename="'+invoiceName+'"')
    pdfDoc.pipe(fs.createWriteStream(invoicePath));
    pdfDoc.pipe(res);
    pdfDoc.fontSize(26).text("Invoice",{
      underline:true
    });
    pdfDoc.text("--------------------------------------------")
    let totalPrice=0;
    order.products.forEach(prod=>{
      totalPrice+=prod.product.price*prod.quantity;
      pdfDoc.fontSize(16).text(
        prod.product.title+' - ('+prod.quantity+') x '+prod.product.price
      )
    })
    pdfDoc.fontSize(26).text("--------------------------------------------")
    pdfDoc.fontSize(20).text("Total - "+totalPrice)
    pdfDoc.end()
  } catch (error) {
      next(error)
  }
  // fs.readFile(invoicePath,(err,data)=>{
  //   if(err){
  //     next(err)
  //   }
  // const file=fs.createReadStream(invoicePath);
  
  // file.pipe(res);
}