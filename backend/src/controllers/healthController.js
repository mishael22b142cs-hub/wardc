const DonationRequest = require('../models/DonationRequest');
const DonationPledge = require('../models/DonationPledge');
const MedicineReminder = require('../models/MedicineReminder');
const HealthRecord = require('../models/HealthRecord');
const User = require('../models/User');
const OpBooking = require('../models/OpBooking');
const CommunityStat = require('../models/CommunityStat');
const InsuranceScheme = require('../models/InsuranceScheme');
const Notification = require('../models/Notification');
const { uploadBuffer, deleteByUrl } = require('../services/storage');

exports.createDonationRequest = async (req, res) => {
    try {
        const { patientName, bloodGroup, hospitalLocation, contactNumber, urgencyLevel, requiredDate, description, requiredUnits } = req.body;
        const request = await DonationRequest.create({
            userId: req.user.id,
            patientName,
            bloodGroup,
            hospitalLocation,
            contactNumber,
            urgencyLevel,
            requiredDate,
            description,
            requiredUnits: requiredUnits || 1,
            fulfilledUnits: 0,
            status: 'Pending'
        });
        res.status(201).json(request);
    } catch (error) {
        console.error('Error creating donation request:', error);
        res.status(500).json({ message: 'Error creating donation request', error: error.message });
    }
};

exports.getAllDonationRequests = async (req, res) => {
    try {
        const { bloodGroup, location } = req.query;
        // Fetch all pending requests so health workers and citizens can view the global pool
        const whereClause = { status: 'Pending' };

        if (bloodGroup) whereClause.bloodGroup = bloodGroup;
        if (location) whereClause.hospitalLocation = location;

        const requests = await DonationRequest.findAll({
            where: whereClause,
            include: [
                { model: User, attributes: ['id', 'full_name', 'email', 'mobile_number'] },
                { 
                    model: DonationPledge, 
                    include: [{ model: User, attributes: ['id', 'full_name'] }] 
                }
            ],
            order: [['createdAt', 'DESC']]
        });
        res.json(requests);
    } catch (error) {
        console.error('Error fetching donation requests:', error);
        res.status(500).json({ message: 'Error fetching donation requests' });
    }
};

exports.getUserDonationRequests = async (req, res) => {
    try {
        const requests = await DonationRequest.findAll({
            where: { userId: req.user.id },
            include: [
                { 
                    model: DonationPledge, 
                    include: [{ model: User, attributes: ['id', 'full_name', 'mobile_number'] }] 
                }
            ],
            order: [['createdAt', 'DESC']]
        });
        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching user requests' });
    }
};

exports.pledgeBloodDonation = async (req, res) => {
    try {
        const { id } = req.params; // DonationRequest ID
        const { unitsDonated } = req.body;
        
        const request = await DonationRequest.findByPk(id);
        if (!request) return res.status(404).json({ message: 'Donation request not found' });
        if (request.status !== 'Pending') return res.status(400).json({ message: 'This request is no longer accepting donations' });

        // Calculate available fraction
        const availableNeeded = request.requiredUnits - request.fulfilledUnits;
        const actualPledge = Math.min(unitsDonated, availableNeeded);

        if (actualPledge <= 0) return res.status(400).json({ message: 'Request already mathematically fulfilled' });

        // 1. Log the Pledge
        const pledge = await DonationPledge.create({
            requestId: request.id,
            donorId: req.user.id,
            unitsDonated: actualPledge
        });

        // 2. Adjust core tracker
        request.fulfilledUnits += actualPledge;
        let newlyFulfilled = false;
        if (request.fulfilledUnits >= request.requiredUnits) {
            request.status = 'Fulfilled';
            newlyFulfilled = true;
        }
        await request.save();

        // 3. Dispatch Push Notification mapped to Requester ID
        const donor = await User.findByPk(req.user.id);
        await Notification.create({
            userId: request.userId,
            type: 'alert',
            message: newlyFulfilled 
                ? `SUCCESS: Your requirement for ${request.requiredUnits} Units of ${request.bloodGroup} blood has been entirely fulfilled! Latest donor: ${donor.full_name}.`
                : `UPDATE: ${donor.full_name} has pledged ${actualPledge} Unit(s) to your ${request.bloodGroup} blood request. Total collected: ${request.fulfilledUnits}/${request.requiredUnits}.`
        });

        res.status(200).json({ pledge, request });
    } catch (error) {
        console.error('Error pledging to blood donation:', error);
        res.status(500).json({ message: 'Error pledging donation', error: error.message });
    }
};

exports.cancelDonationRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const request = await DonationRequest.findOne({ where: { id, userId: req.user.id } });
        if (!request) return res.status(404).json({ message: 'Record not found or unauthorized' });

        request.status = 'Cancelled';
        await request.save();

        res.json({ message: 'Donation request artificially cancelled and removed from active global feed.' });
    } catch (error) {
        res.status(500).json({ message: 'Error cancelling donation request' });
    }
};

// --- Medicine Reminders ---

exports.addMedicineReminder = async (req, res) => {
    try {
        const { medicineName, frequency, scheduledTimes, startDate, endDate, instructions } = req.body;
        const reminder = await MedicineReminder.create({
            userId: req.user.id,
            medicineName,
            frequency,
            scheduledTimes,
            startDate,
            endDate,
            instructions
        });
        res.status(201).json(reminder);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error adding medicine reminder' });
    }
};

exports.getMedicineReminders = async (req, res) => {
    try {
        const reminders = await MedicineReminder.findAll({
            where: { userId: req.user.id },
            order: [['createdAt', 'DESC']]
        });
        res.json(reminders);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching reminders' });
    }
};

exports.deleteMedicineReminder = async (req, res) => {
    try {
        const { id } = req.params;
        await MedicineReminder.destroy({ where: { id, userId: req.user.id } });
        res.json({ message: 'Reminder deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting reminder' });
    }
};

// --- Health Records ---

exports.addHealthRecord = async (req, res) => {
    try {
        const { title, recordDate, doctorName, hospitalName, category, description } = req.body;
        
        // Grab the physical file if Multer caught one
        let computedFileUrl = null;
        let computedCategory = category || 'DOCUMENT';
        let computedTitle = title || 'Uploaded Record';
        
        if (req.file) {
            computedFileUrl = await uploadBuffer(
                req.file.buffer,
                req.file.originalname,
                req.file.mimetype,
                'health-records'
            );
            if (!category) {
                 computedCategory = req.file.originalname.split('.').pop().toUpperCase();
            }
            if (!title) {
                 computedTitle = req.file.originalname;
            }
        }

        const record = await HealthRecord.create({
            userId: req.user.id,
            title: computedTitle,
            recordDate: recordDate || new Date().toISOString().split('T')[0],
            doctorName,
            hospitalName,
            category: computedCategory,
            description,
            fileUrl: computedFileUrl
        });
        res.status(201).json(record);
    } catch (error) {
        console.error(error);
        res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : 'Error adding health record' });
    }
};

exports.getHealthRecords = async (req, res) => {
    try {
        const records = await HealthRecord.findAll({
            where: { userId: req.user.id },
            order: [['recordDate', 'DESC']]
        });
        res.json(records);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching health records' });
    }
};

exports.deleteHealthRecord = async (req, res) => {
    try {
        const { id } = req.params;
        const record = await HealthRecord.findOne({ where: { id, userId: req.user.id } });
        
        if (!record) {
            return res.status(404).json({ message: 'Record not found' });
        }

        // Remove the stored file (Vercel Blob); legacy /uploads paths are ignored.
        if (record.fileUrl) {
            await deleteByUrl(record.fileUrl);
        }

        await record.destroy();
        res.json({ message: 'Health record successfully deleted' });
    } catch (error) {
        console.error('Error deleting health record:', error);
        res.status(500).json({ message: 'Error deleting health record' });
    }
};

// --- OP Ticket Bookings ---

exports.createOpBooking = async (req, res) => {
    try {
        const { hospital, department, date, timeSlot, patientDetails } = req.body;
        const booking = await OpBooking.create({
            userId: req.user.id,
            hospital,
            department,
            date,
            timeSlot,
            patientDetails
        });
        res.status(201).json(booking);
    } catch (error) {
        console.error('Error creating OP booking:', error);
        res.status(500).json({ message: 'Error creating OP booking', error: error.message });
    }
};

exports.getUserOpBookings = async (req, res) => {
    try {
        const bookings = await OpBooking.findAll({
            where: { userId: req.user.id },
            order: [['createdAt', 'DESC']]
        });
        res.json(bookings);
    } catch (error) {
        console.error('Error fetching OP bookings:', error);
        res.status(500).json({ message: 'Error fetching OP bookings', error: error.message });
    }
};

exports.cancelOpBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const booking = await OpBooking.findOne({ where: { id, userId: req.user.id } });
        if (!booking) return res.status(404).json({ message: 'Booking not found' });

        await booking.destroy();
        res.json({ message: 'OP booking cancelled successfully' });
    } catch (error) {
        console.error('Error cancelling OP booking:', error);
        res.status(500).json({ message: 'Error cancelling OP booking', error: error.message });
    }
};

exports.getAllOpBookings = async (req, res) => {
    try {
        const bookings = await OpBooking.findAll({
            include: [{ model: User, attributes: ['full_name', 'email', 'mobile_number'] }],
            order: [['createdAt', 'DESC']]
        });
        res.json(bookings);
    } catch (error) {
        console.error('Error fetching all OP bookings:', error);
        res.status(500).json({ message: 'Error fetching all OP bookings', error: error.message });
    }
};

exports.updateOpBookingStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, tokenNumber, rejectionReason, timeSlot } = req.body;

        const booking = await OpBooking.findByPk(id);
        if (!booking) return res.status(404).json({ message: 'Booking not found' });

        booking.status = status || booking.status;
        booking.tokenNumber = tokenNumber || booking.tokenNumber;
        booking.rejectionReason = rejectionReason || booking.rejectionReason;
        if (timeSlot) booking.timeSlot = timeSlot;
        booking.healthWorkerId = req.user.id;

        await booking.save();
        res.json(booking);
    } catch (error) {
        console.error('Error updating OP booking status:', error);
        res.status(500).json({ message: 'Error updating status', error: error.message });
    }
};

// --- Community Health Stats ---

exports.getCommunityStats = async (req, res) => {
    try {
        const stats = await CommunityStat.findAll({
            order: [['date', 'ASC']],
            limit: 7 // Only get the last 7 days for the graph
        });
        res.json(stats);
    } catch (error) {
        console.error('Error fetching community stats:', error);
        res.status(500).json({ message: 'Error fetching stats' });
    }
};

exports.updateCommunityStats = async (req, res) => {
    try {
        const { date, cases, active, alerts, alertMessage, immunity } = req.body;
        
        let stat = await CommunityStat.findOne({ where: { date: date } });
        
        if (stat) {
            stat.cases = cases;
            stat.active = active;
            stat.alerts = alerts;
            stat.alertMessage = alertMessage;
            stat.immunity = immunity;
            await stat.save();
        } else {
            stat = await CommunityStat.create({
                date,
                cases,
                active,
                alerts,
                alertMessage,
                immunity
            });
        }
        
        res.status(200).json(stat);
    } catch (error) {
        console.error('Error updating community stats:', error);
        res.status(500).json({ message: 'Error updating stats' });
    }
};

// --- Insurance Schemes ---

exports.getInsuranceSchemes = async (req, res) => {
    try {
        const schemes = await InsuranceScheme.findAll({
            order: [['createdAt', 'DESC']]
        });
        res.json(schemes);
    } catch (error) {
        console.error('Error fetching insurance schemes:', error);
        res.status(500).json({ message: 'Error fetching insurance schemes' });
    }
};

exports.addInsuranceScheme = async (req, res) => {
    try {
        const { name, coverAmount, description, minAge, maxAge, incomeLimit, stateRestriction, employmentRestriction } = req.body;
        const scheme = await InsuranceScheme.create({
            name,
            coverAmount,
            description,
            minAge: minAge || 0,
            maxAge: maxAge || 150,
            incomeLimit: incomeLimit || null,
            stateRestriction: stateRestriction || null,
            employmentRestriction: employmentRestriction || null
        });
        res.status(201).json(scheme);
    } catch (error) {
        console.error('Error adding insurance scheme:', error);
        res.status(500).json({ message: 'Error adding scheme', error: error.message });
    }
};
