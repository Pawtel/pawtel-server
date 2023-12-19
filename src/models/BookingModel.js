const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const BookingSchema = new Schema({
     roomType: {
          type: String,
          required: true,
          unique: false
     },
     startDate: {
          type: Date,
          required: true,
          unique: false
     },
     endDate: {
          type: Date,
          required: true,
          unique: false
     },
     pet: {
		type: mongoose.Types.ObjectId,
		ref: 'Pet'
	},
     room: {
		type: mongoose.Types.ObjectId,
		ref: 'User'
	},

});

BookingSchema.pre(
     'save',
     async function (next) {
          console.log("About to save a booking to PawtelDB");
          next();
     }
)

const Booking = mongoose.model('Booking', BookingSchema);

module.exports = {
     Booking
}

/* Booking Model

const Booking = mongoose.model(`Booking`, {
     roomType: String,
     startDate: Date,
     endDate: Date
}

*/