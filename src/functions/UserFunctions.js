// Require specific models so that we can 
// create functionality involving them.
const { User } = require('../models/UserModel');

const dotenv = require('dotenv');
dotenv.config();


// --------------------------------------
// ----- Encryption & decryption functionality

const crypto = require('crypto');
let encAlgorithm = 'aes-256-cbc';
let encPrivateKey = crypto.scryptSync(process.env.ENC_KEY, 'SpecialSalt', 32);
let encIV = crypto.scryptSync(process.env.ENC_IV, 'SpecialSalt', 16);
let cipher = crypto.createCipheriv(encAlgorithm, encPrivateKey, encIV);
let decipher = crypto.createDecipheriv(encAlgorithm, encPrivateKey, encIV);

// Convert a given string into an encrypted string.
function encryptString(data){
    cipher = crypto.createCipheriv(encAlgorithm, encPrivateKey, encIV);
    return cipher.update(data, 'utf8', 'hex') + cipher.final('hex');
}

// Turn the encrypted data back into a plaintext string.
function decryptString(data){
    decipher = crypto.createDecipheriv(encAlgorithm, encPrivateKey, encIV);
    return decipher.update(data, 'hex', 'utf8') + decipher.final('utf8');
}

// Assumes an encrypted string is a JSON object.
// Decrypts that string and turns it into a regular JavaScript object.
function decryptObject(data){
    return JSON.parse(decryptString(data));
}

// --------------------------------------
// ----- Hashing & Salting functionality

const bcrypt = require('bcryptjs');
const saltRounds = 10;

// Hashes a string using bcrypt with a specified number of salt rounds
async function hashString(stringToHash){
    let saltToAdd = await bcrypt.genSalt(saltRounds);
    return await bcrypt.hash(stringToHash, saltToAdd);
}

// Validates hashed data by comparing it with provided unhashed data
async function validateHashedData(providedUnhashedData, storedHashedData){
     if (providedUnhashedData === undefined || storedHashedData === undefined) {
          // Handle the case where either of the values is undefined.
          return false;
     }
    return await bcrypt.compare(providedUnhashedData, storedHashedData);
}

// --------------------------------------
// ----- JWT functionality

const jwt = require('jsonwebtoken');

// Generates a JSON Web Token (JWT) with the provided payload
function generateJWT(payloadObj){
     return jwt.sign(payloadObj, process.env.JWT_SECRET, { expiresIn: "7d"});
 }

// Generates a JWT with an encrypted payload containing user details.
async function generateUserJWT(userDetails) {
     // Encrypt the payload so that it's not plaintext when viewed outside of this app.
     let encryptedUserData = encryptString(JSON.stringify(userDetails));
     // The expiresIn option only works if the payload is an object, not a string.
     // Include userId directly in the payload without encryption.
     const payload = {
       userId: userDetails.userId,
       data: encryptedUserData,
     };
     return generateJWT(payload);
   }

// Verifies and refreshes a user JWT, returning a new JWT with a longer expiration time.
async function verifyUserJWT(userJWT) {
     try {
       let userJwtVerified = jwt.verify(userJWT, process.env.JWT_SECRET, {
         complete: true,
       });
   
       const nowInSeconds = Math.floor(Date.now() / 1000);
   
       if (
         userJwtVerified.payload.exp &&
         userJwtVerified.payload.exp < nowInSeconds
       ) {
         throw new Error('Token expired');
       }
   
       // Decrypt the encrypted payload.
       let decryptedJwtPayload = decryptString(userJwtVerified.payload.data);
   
       // Parse the decrypted data into an object.
       let userData = JSON.parse(decryptedJwtPayload);
   
       // Find the user mentioned in the JWT.
       let targetUser = await User.findById(userData.userId).exec();
   
       // If the JWT data matches the stored data...
       if (
         targetUser &&
         (targetUser.password, userData.password) &&
         targetUser.email == userData.email
       ) {
         // ...User details are valid, make a fresh JWT to extend their token's valid time
         return generateJWT({ data: userJwtVerified.payload.data });
       } else {
         // Otherwise, user details are invalid and they don't get a new token.
         // When a frontend receives this error, it should redirect to a sign-in page.
         throw new Error('Invalid user token.');
       }
     } catch (error) {
       console.error(error);
   
       if (error.message === 'Token expired') {
         // Handle token expiration response
         response.status(401).json({
           error: 'Token expired',
           message: 'The provided token has expired. Please log in again to obtain a new token.'
         });
       } else {
         // Handle other verification errors
         response.status(401).json({
           error: 'Invalid JWT',
           message: 'The provided token is invalid.'
         });
       }
     }
   }
   

// Returns the user Id extracted from a user JWT.

async function getUserIdFromJwt(userJWT) {
     try {
       let userJwtVerified = jwt.verify(userJWT, process.env.JWT_SECRET, {
         complete: true,
       });
   
       // Decrypt the encrypted payload.
       let decryptedJwtPayload = decryptString(userJwtVerified.payload.data);
   
       // Parse the decrypted data into an object.
       let userData = JSON.parse(decryptedJwtPayload);
   
       // Find the user mentioned in the JWT.
       let targetUser = await User.findById(userData.userId).exec();
   
       // If the JWT data matches the stored data...
       if (
         targetUser &&
         targetUser.password == userData.password &&
         targetUser.email == userData.email
       ) {
         // Return the user Id
         return userData.userId;
       } else {
         // Otherwise, user details are invalid.
         throw new Error('Invalid user token.');
       }
     } catch (error) {
       // Handle JWT verification errors
       throw new Error('Invalid user token.');
     }
}
   

// --------------------------------------
// ----- MongoDB/MongooseJS functionality

// Returns an array of raw MongoDB database documents for all users.
async function getAllUsers() {
     return await User.find({});
   }

// Creates a new user based on userDetails data and saves it to the database.

async function createUser(userDetails) {
     // Create new user based on userDetails data
     let newUser = new User({
       firstName: userDetails.firstName,
       lastName: userDetails.lastName,
       email: userDetails.email,
       password: userDetails.password,
     });
   
     // And save it to DB
     return await newUser.save();
   }

async function updateUser(userDetails) {
     // Hash the password if it's provided in the userDetails
     if (userDetails.updatedData.password) {
       userDetails.updatedData.password = await hashString(userDetails.updatedData.password);
     }
   
     // Find user, update it, return the updated user data.
     return await User.findByIdAndUpdate(
       userDetails.userId,
       userDetails.updatedData,
       { returnDocument: 'after' }
     ).exec();
   }

//Deletes an existing user by Id.
async function deleteUser(userId) {
     return await User.findByIdAndDelete(userId).exec();
   }


//  Deletes an existing user by email.
async function deleteUserByEmail() {
  // Check if a user with the specified email exists
  const userToDelete = await User.findOne({email});

  if (userToDelete) {
    // If the user exists, delete them
    await User.deleteOne({email});
    console.log(`User with email ${email} deleted.`);
  } else {
    console.log(`No user found with email ${email}.`);
  }
}




// --------------------------------------
// ----- Exports

module.exports = {
     encryptString,
     decryptString,
     decryptObject,
     hashString,
     validateHashedData,
     generateJWT,
     generateUserJWT,
     getUserIdFromJwt,
     verifyUserJWT,
     getAllUsers,
     createUser,
     updateUser,
     deleteUser,
     deleteUserByEmail,
   };