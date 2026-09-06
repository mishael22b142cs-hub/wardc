const CartItem = require('../models/CartItem');
const WishlistItem = require('../models/WishlistItem');
const Product = require('../models/Product');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const { sequelize } = require('../config/database');
const User = require('../models/User');
const { uploadBuffer } = require('../services/storage');

const Razorpay = require('razorpay');
let razorpay;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
    });
} else {
    // console.warn("RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is missing in shopController.");
}

const shopController = {
    // --- Razorpay API ---
    createRazorpayOrder: async (req, res) => {
        try {
            const { amount } = req.body;
            const options = {
                amount: amount * 100, // Amount in paise
                currency: 'INR',
                receipt: 'receipt_order_' + Date.now()
            };
            if (!razorpay) {
                return res.status(400).json({ message: 'Razorpay API keys are missing. Please configure them in the .env file.' });
            }
            const order = await razorpay.orders.create(options);
            res.json(order);
        } catch (error) {
            console.error('Razorpay API Error:', error);
            res.status(500).json({ message: 'Razorpay API Error: Please verify your RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in the .env file.' });
        }
    },

    // --- Product Management (Seller Hub) ---
    createProduct: async (req, res) => {
        try {
            if (req.user.role !== 'Shopkeeper') { // Ensure case matches enum
                return res.status(403).json({ message: 'Access denied. Shopkeepers only.' });
            }
            let imageUrl = req.body.image;
            if (req.file) {
                imageUrl = await uploadBuffer(req.file.buffer, req.file.originalname, req.file.mimetype, 'products');
            }

            const product = await Product.create({
                ...req.body,
                image: imageUrl,
                sellerId: req.user.id
            });
            res.json(product);
        } catch (error) {
            console.error(error);
            res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : 'Error creating product' });
        }
    },

    getSellerProducts: async (req, res) => {
        try {
            const products = await Product.findAll({ where: { sellerId: req.user.id } });
            res.json(products);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error fetching products' });
        }
    },

    updateProduct: async (req, res) => {
        try {
            const { id } = req.params;
            const product = await Product.findOne({ where: { id, sellerId: req.user.id } });
            if (!product) return res.status(404).json({ message: 'Product not found or unauthorized' });

            let imageUrl = req.body.image;
            if (req.file) {
                imageUrl = await uploadBuffer(req.file.buffer, req.file.originalname, req.file.mimetype, 'products');
            } else if (imageUrl === undefined) {
                // Only update image if provided (in body or file)
                // If undefined, do not overwrite existing image with undefined?
                // Sequelize update updates fields present in object.
                // We should prepare updateData.
                imageUrl = product.image; // Keep existing
            }

            const updateData = { ...req.body };
            if (imageUrl) updateData.image = imageUrl;

            await product.update(updateData);
            res.json(product);
        } catch (error) {
            console.error(error);
            res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : 'Error updating product' });
        }
    },

    deleteProduct: async (req, res) => {
        try {
            const { id } = req.params;
            const product = await Product.findOne({ where: { id, sellerId: req.user.id } });
            if (!product) return res.status(404).json({ message: 'Product not found or unauthorized' });

            await product.destroy();
            res.json({ message: 'Product deleted' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error deleting product' });
        }
    },

    // --- Order Management (Seller Hub) ---
    getSellerOrders: async (req, res) => {
        try {
            // Find all order items belonging to products sold by this user
            const orderItems = await OrderItem.findAll({
                include: [
                    {
                        model: Product,
                        where: { sellerId: req.user.id },
                        attributes: ['title', 'image', 'price']
                    },
                    {
                        model: Order,
                        include: [{ model: User, attributes: ['full_name', 'mobile_number', 'address', 'house_number', 'ward_number'] }]
                    }
                ],
                order: [['createdAt', 'DESC']]
            });
            res.json(orderItems);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error fetching orders' });
        }
    },

    updateOrderItemStatus: async (req, res) => {
        try {
            const { id } = req.params;
            const { status } = req.body;

            // Validate user owns the product related to this order item
            const orderItem = await OrderItem.findOne({
                where: { id },
                include: [{ model: Product, where: { sellerId: req.user.id } }]
            });

            if (!orderItem) return res.status(404).json({ message: 'Order Item not found or unauthorized' });

            orderItem.status = status;
            await orderItem.save();
            res.json(orderItem);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error updating order status' });
        }
    },

    // --- Public Shop Data ---
    getAllProducts: async (req, res) => {
        try {
            const products = await Product.findAll();
            res.json(products);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error fetching products' });
        }
    },

    // --- Cart Operations ---
    getCart: async (req, res) => {
        try {
            const items = await CartItem.findAll({
                where: { userId: req.user.id },
                include: [{ model: Product, attributes: ['id', 'title', 'price', 'image', 'category'] }]
            });
            res.json(items);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error fetching cart' });
        }
    },

    addToCart: async (req, res) => {
        try {
            const { productId, title, price, image, category } = req.body;
            let item = await CartItem.findOne({
                where: { userId: req.user.id, productId }
            });

            if (item) {
                item.quantity += 1;
                await item.save();
            } else {
                item = await CartItem.create({
                    userId: req.user.id,
                    productId,
                    productTitle: title,
                    productPrice: price,
                    productImage: image,
                    productCategory: category,
                    quantity: 1
                });
            }
            res.json(item);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error adding to cart' });
        }
    },

    updateCartQuantity: async (req, res) => {
        try {
            const { id } = req.params; // Cart Item ID, NOT product ID
            const { quantity } = req.body;

            const item = await CartItem.findOne({ where: { id, userId: req.user.id } });
            if (!item) return res.status(404).json({ message: 'Item not found' });

            if (quantity <= 0) {
                await item.destroy();
                return res.json({ message: 'Item removed', id: item.id });
            }

            item.quantity = quantity;
            await item.save();
            res.json(item);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error updating quantity' });
        }
    },

    removeFromCart: async (req, res) => {
        try {
            const { id } = req.params;
            await CartItem.destroy({ where: { id, userId: req.user.id } });
            res.json({ message: 'Item removed', id });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error removing item' });
        }
    },

    // --- Order Operations ---
    checkout: async (req, res) => {
        const { calculateCompletion } = require('./user.controller');
        const user = await User.findByPk(req.user.id);
        const completion = calculateCompletion(user);

        if (completion < 50) {
            return res.status(403).json({ message: `Your profile is only ${completion}% complete. Please complete your profile to at least 50% before placing an order.` });
        }

        const t = await sequelize.transaction();
        try {
            // 1. Get Cart Items
            const cartItems = await CartItem.findAll({
                where: { userId: req.user.id },
                include: [{ model: Product }],
                transaction: t
            });

            if (cartItems.length === 0) {
                await t.rollback();
                return res.status(400).json({ message: 'Cart is empty' });
            }

            // 2. Calculate Total
            let totalAmount = 0;
            cartItems.forEach(item => {
                const price = item.Product ? item.Product.price : item.productPrice;
                totalAmount += price * item.quantity;
            });

            // 3. Create Order
            const order = await Order.create({
                userId: req.user.id,
                totalAmount,
                shippingAddress: req.body.shippingAddress || req.user.address || 'Default Address',
                paymentMethod: req.body.paymentMethod || 'Cash on Delivery',
                status: 'Pending'
            }, { transaction: t });

            // 4. Create Order Items
            const orderItemsData = cartItems.map(item => ({
                orderId: order.id,
                productId: item.productId,
                quantity: item.quantity,
                price: item.Product ? item.Product.price : item.productPrice,
                status: 'Pending'
            }));

            await OrderItem.bulkCreate(orderItemsData, { transaction: t });

            // 5. Clear Cart
            await CartItem.destroy({
                where: { userId: req.user.id },
                transaction: t
            });

            await t.commit(); // Commit transaction

            res.status(201).json({
                message: 'Order placed successfully',
                orderId: order.id,
                totalAmount
            });

        } catch (error) {
            await t.rollback();
            console.error('Checkout error:', error);
            res.status(500).json({ message: 'Error during checkout' });
        }
    },

    // --- Wishlist Operations ---
    getWishlist: async (req, res) => {
        try {
            const items = await WishlistItem.findAll({
                where: { userId: req.user.id },
                include: [{ model: Product, attributes: ['id', 'title', 'price', 'image', 'category'] }]
            });
            res.json(items);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error fetching wishlist' });
        }
    },

    addToWishlist: async (req, res) => {
        try {
            const { productId, title, price, image, category } = req.body;

            const existing = await WishlistItem.findOne({
                where: { userId: req.user.id, productId }
            });

            if (existing) {
                return res.json({ message: 'Already in wishlist', item: existing });
            }

            const item = await WishlistItem.create({
                userId: req.user.id,
                productId,
                productTitle: title,
                productPrice: price,
                productImage: image,
                productCategory: category
            });
            res.json(item);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error adding to wishlist' });
        }
    },

    removeFromWishlist: async (req, res) => {
        try {
            const { productId } = req.params; // Using productId for easier toggle logic
            await WishlistItem.destroy({ where: { productId, userId: req.user.id } });
            res.json({ message: 'Removed from wishlist', productId });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error removing from wishlist' });
        }
    }
};

module.exports = shopController;
