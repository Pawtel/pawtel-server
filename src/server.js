const express = require('express');

const bookingRouter = require('./routes/BookingsRoutes');
const userRouter = require('./routes/UserRoutes');

// make an instance of the server that we can customise and run
const app = express();

const cors = require('cors');
const corsOptions = {
     origin: ["http://localhost:3030/", "http://localhost:3030", "https://pawtel.netlify.app/"],
     optionsSuccessStatus: 200
}
app.use(cors(corsOptions));


// To Enable HTTP verb responses to support JSON body and form data.
app.use(express.json());
app.use(express.urlencoded({extended: true}));

/* GET localhost:3030/ */ 
app.get("/", (request, response) => {

     response.json('Welcome to Pawtel!');

});

// Pawtel utilises the following routes:
app.use("/bookings", bookingRouter);
app.use("/users", userRouter);


module.exports = {
     app, 
}