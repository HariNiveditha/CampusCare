const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Complaint = require('../models/Complaint');
const Counter = require('../models/Counter');

dotenv.config();

const migrateData = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('Migration error: MONGODB_URI is not set in environment variables.');
      process.exit(1);
    }

    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB for data migration');

    // Find complaints lacking ticketNumber
    const complaintsWithoutTicket = await Complaint.find({
      $or: [
        { ticketNumber: { $exists: false } },
        { ticketNumber: null },
        { ticketNumber: '' },
      ],
    }).sort({ createdAt: 1 });

    console.log(`Found ${complaintsWithoutTicket.length} complaints needing ticket numbers`);

    // Ensure counter is initialized or incremented
    let updatedCount = 0;
    for (const complaint of complaintsWithoutTicket) {
      const counter = await Counter.findByIdAndUpdate(
        'ticketNumber',
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      complaint.ticketNumber = `CMP${String(counter.seq).padStart(4, '0')}`;
      if (!complaint.priority) {
        complaint.priority = 'Medium';
      }
      if (!complaint.workNotes) {
        complaint.workNotes = [];
      }
      if (!complaint.location) {
        complaint.location = '';
      }
      if (!complaint.photo) {
        complaint.photo = '';
      }
      await complaint.save();
      updatedCount++;
    }

    console.log(`Successfully migrated ${updatedCount} complaint records.`);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  migrateData();
}

module.exports = migrateData;
