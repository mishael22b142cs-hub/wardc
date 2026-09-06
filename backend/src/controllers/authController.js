const User = require('../models/User');
const OtpVerification = require('../models/Otp');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { calculateCompletion } = require('./user.controller');
const { verifyCaptcha } = require('../services/captcha');

const generateToken = (user) => {
    return jwt.sign(
        { id: user.id, role: user.role, mobile_number: user.mobile_number, house_number: user.house_number },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '7d' }
    );
};

// --- OTP Helper ---
const verifyOtp = async (mobile_number, otp) => {
    const record = await OtpVerification.findOne({
        where: { mobile_number },
        order: [['createdAt', 'DESC']]
    });
    if (!record) return { valid: false, message: 'OTP not found. Please request a new one.' };
    if (new Date() > new Date(record.expires_at)) return { valid: false, message: 'OTP has expired. Please request a new one.' };
    if (String(record.otp) !== String(otp)) return { valid: false, message: 'Invalid OTP. Please try again.' };
    // Clean up used OTP
    await record.destroy();
    return { valid: true };
};

exports.sendOtp = async (req, res) => {
    try {
        const { mobile_number, captchaToken } = req.body;
        if (!mobile_number) return res.status(400).json({ message: 'Mobile number is required.' });

        // Bot protection (Cloudflare Turnstile). Skipped when no secret is configured.
        const clientIp = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip;
        const captcha = await verifyCaptcha(captchaToken, clientIp);
        if (!captcha.ok) {
            return res.status(400).json({ message: 'CAPTCHA verification failed. Please try again.' });
        }

        // Generate a 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expires_at = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

        // Delete any previous OTPs for this number
        await OtpVerification.destroy({ where: { mobile_number } });

        // Save the new OTP
        await OtpVerification.create({ mobile_number, otp, expires_at });

        const apiKey = process.env.FAST2SMS_API_KEY;

        // Always log the OTP in terminal (for debugging/dev)
        console.log(`\n========================================`);
        console.log(`📱 OTP for ${mobile_number}: ${otp}`);
        console.log(`========================================\n`);

        if (apiKey) {
            // Try to send via Fast2SMS
            try {
                const response = await axios.post(
                    'https://www.fast2sms.com/dev/bulkV2',
                    {
                        route: 'q',
                        message: `Your WardConnect OTP is: ${otp}. Valid for 10 minutes. Do not share with anyone.`,
                        numbers: mobile_number,
                        flash: '0',
                    },
                    {
                        headers: {
                            authorization: apiKey,
                            'Content-Type': 'application/json',
                        }
                    }
                );
                console.log('Fast2SMS response:', JSON.stringify(response.data));
                if (response.data.return) {
                    return res.json({ message: `OTP sent via SMS to ${mobile_number}` });
                }
                // SMS failed but we still have OTP in terminal - return it in response for dev
                console.warn('Fast2SMS failed:', response.data);
            } catch (smsError) {
                console.error('Fast2SMS Error:', smsError.response?.data || smsError.message);
            }
        }

        // If no SMS provider is configured, return the OTP in the response so the
        // frontend can auto-fill it. Once FAST2SMS_API_KEY is set this stops.
        res.json({
            message: process.env.FAST2SMS_API_KEY
                ? 'OTP sent.'
                : 'OTP generated (no SMS provider configured — returned in response).',
            dev_otp: process.env.FAST2SMS_API_KEY ? undefined : otp
        });
    } catch (error) {
        console.error("Send OTP Error:", error.response?.data || error.message);
        res.status(500).json({ message: 'Error sending OTP', error: error.message });
    }
};

exports.signup = async (req, res) => {
    try {
        const {
            full_name, mobile_number, email, password, role, otp,
            ward_number, panchayat_name, address, aadhaar_number, house_number, profile_image
        } = req.body;

        // Verify OTP before creating the user
        const otpCheck = await verifyOtp(mobile_number, otp);
        if (!otpCheck.valid) {
            return res.status(400).json({ message: otpCheck.message });
        }

        // Check if user exists
        const existingUser = await User.findOne({ where: { mobile_number } });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists with this mobile number.' });
        }

        const password_hash = await bcrypt.hash(password, 10);
        const is_approved = ['Citizen'].includes(role);

        const newUser = await User.create({
            full_name, mobile_number, email, password_hash, role,
            house_number, ward_number, panchayat_name, address,
            aadhaar_number, is_approved, is_verified: true, profile_image
        });

        res.status(201).json({
            message: 'User registered successfully',
            user: { id: newUser.id, role: newUser.role, is_approved }
        });
    } catch (error) {
        console.error("Signup Error:", error);
        res.status(500).json({
            message: 'Error creating user',
            error: error.message,
            details: error.original ? error.original.detail : null
        });
    }
};

exports.login = async (req, res) => {
    try {
        const { mobile_number, password, role, otp } = req.body;

        // Verify OTP before logging in
        const otpCheck = await verifyOtp(mobile_number, otp);
        if (!otpCheck.valid) {
            return res.status(400).json({ message: otpCheck.message });
        }

        const user = await User.findOne({ where: { mobile_number } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (role && user.role !== role) {
            return res.status(403).json({ message: `Incorrect role. User is registered as ${user.role}` });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = generateToken(user);

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                role: user.role,
                house_number: user.house_number,
                ward_number: user.ward_number,
                is_approved: user.is_approved,
                profile_image: user.profile_image,
                completion: calculateCompletion(user)
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during login' });
    }
};



exports.verifyOtp = async (req, res) => {
    const { mobile_number, otp } = req.body;
    const verification = await OtpVerification.findOne({ where: { mobile_number, otp } });

    if (!verification) {
        return res.status(400).json({ message: 'Invalid OTP' });
    }

    if (new Date() > verification.expires_at) {
        return res.status(400).json({ message: 'OTP expired' });
    }

    // Mark verified logic here if this was a standalone verification step

    // Clean up
    await verification.destroy();

    res.json({ message: 'OTP verified successfully' });
};

exports.resetPassword = async (req, res) => {
    try {
        const { mobile_number, role, new_password } = req.body;

        const user = await User.findOne({ where: { mobile_number } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (role && user.role !== role) {
            return res.status(403).json({ message: 'Role does not match registered role for this number' });
        }

        const password_hash = await bcrypt.hash(new_password, 10);
        user.password_hash = password_hash;
        await user.save();

        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error("Reset Password Error:", error);
        res.status(500).json({ message: 'Server error resetting password' });
    }
};
