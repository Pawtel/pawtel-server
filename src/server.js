const express = require('express');
const bookingRouter = require('./routes/BookingsRoutes');

// make an instance of the server that we can customise and run
const app = express();

{/* To Enable HTTP verb responses to support JSON body and form data. */}
app.use(express.json());
app.use(express.urlencoded({extended: true}));


{/* GET localhost:3000/ */} 
// app.get(route path, callback_function)
app.get("/", (request, response) => {

     res.json('Welcome to Pawtel!');

});

app.use("/bookings", bookingRouter);


module.exports = {
     app, 
     PORT
}