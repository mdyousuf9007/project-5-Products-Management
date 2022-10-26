const userModel = require("../models/UserModel");
const valid = require("../validator/validator");
const jwt = require("jsonwebtoken");
const { uploadFile } = require("../controller/awsController");
const bcrypt = require("bcrypt");

//===========================================create user=====================================//
const createUser = async (req, res) => {
  try {
    let data = req.body;
    let { fname, lname, email, phone, password } = data;
    let files = req.files;
    if (!valid.isValidRequestBody(data)) {
      return res
        .status(400)
        .send({
          status: false,
          message: "please provide data in request body",
        });
    }
    //+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++Address Validation+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    let requiredField = [
      "fname",
      "lname",
      "email",
      "phone",
      "password",
      "address",
    ];

    for (field of requiredField) {
      if (!data[field]) {
        return res
          .status(400)
          .send({
            status: false,
            message: `Please provide ${field} field in request body`,
          });
      }
    }

    try {
      data.address = JSON.parse(data.address);
    } catch (error) {
      return res
        .status(400)
        .send({ status: false, message: "address must be an object" });
    }

    requiredField = ["shipping", "billing"];

    for (field of requiredField) {
      if (!data.address[field]) {
        return res
          .status(400)
          .send({
            status: false,
            message: `Please provide ${field} key in address Object`,
          });
      }
    }

    requiredField = ["street", "city", "pincode"];
    for (field of requiredField) {
      if (!data.address.shipping[field]) {
        return res
          .status(400)
          .send({
            status: false,
            message: `Please provide ${field} key in shipping object in address field`,
          });
      } else {
        if (field == "pincode") {
          if (!valid.isValidPincode(data.address.shipping[field])) {
            return res
              .status(400)
              .send({
                status: false,
                message: `Please provide valid value in ${field} key in shipping object in address field`,
              });
          }
        } else {
          if (!valid.isValid(data.address.shipping[field])) {
            return res
              .status(400)
              .send({
                status: false,
                message: `Please provide valid value in ${field} key in shipping object in address field`,
              });
          }
        }
      }
      if (!data.address.billing[field]) {
        return res
          .status(400)
          .send({
            status: false,
            message: `Please provide ${field} key in billing object in address field`,
          });
      } else {
        if (field == "pincode") {
          if (!valid.isValidPincode(data.address.shipping[field])) {
            return res
              .status(400)
              .send({
                status: false,
                message: `Please provide valid value in ${field} key in billing object in address field`,
              });
          }
        } else {
          if (!valid.isValid(data.address.shipping[field])) {
            return res
              .status(400)
              .send({
                status: false,
                message: `Please provide valid value in ${field} key in billing object in address field`,
              });
          }
        }
      }
    }

    //---------------------------Validation Fname------------------------------------------//
    fname = fname.trim();
    if (!valid.isValid(fname)) {
      return res
        .status(400)
        .send({ status: false, message: " Fname is Not Valid." });
    }
    
    if (!valid.isValidName(fname)) {
      return res
        .status(400)
        .send({ status: false, message: " Fname is Not Valid" });
    }
    //---------------------------Validation Lname------------------------------------------//
    lname = lname.trim();
    if (!valid.isValid(lname)) {
      return res
        .status(400)
        .send({ status: false, message: " Lname is Not Valid." });
    }
    if (!valid.isValidName(lname)) {
      return res
        .status(400)
        .send({ status: false, message: " Lname is Not Valid" });
    }
    //---------------------------Validation Email------------------------------------------//
    email = email.trim();
    if (!valid.isValid(email)) {
      return res
        .status(400)
        .send({ status: false, message: "Email is Not Valid." });
    }
    if (!valid.isValidEmail(email)) {
      return res
        .status(400)
        .send({ status: false, message: " Email is Not Valid" });
    }
    let emailIsUnique = await userModel.findOne({ email: email });
    if (emailIsUnique) {
      return res
        .status(400)
        .send({ status: false, message: "Please provide unique email" });
    }
    //---------------------------Phone------------------------------------------------------//
    phone = phone.trim();
    if (!valid.isValid(phone)) {
      return res
        .status(400)
        .send({ status: false, message: "Phone is Not Valid." });
    }
    if (!valid.isValidMobile(phone)) {
      return res
        .status(400)
        .send({ status: false, message: "Phone is Not Valid" });
    }
    let phoneIsUnique = await userModel.findOne({ phone: phone });
    if (phoneIsUnique) {
      return res
        .status(400)
        .send({ status: false, message: "Please provide unique phone" });
    }
    //----------------------------Password---------------------------------------------------//
    password = password.trim();
    if (!valid.isValidPassword(password)) {
      return res
        .status(400)
        .send({ status: false, message: "Password is Not Valid" });
    }

    const saltRounds = 10;
    bcrypt.hash(password, saltRounds, function (err, hash) {
      data.password = hash;
     
    });
    //---------------------------Validation Profile Image----------------------------------//
    if (!files[0]) {
      return res
        .status(400)
        .send({ status: false, message: "Please provide image File" });
    }
    let fileURL = await uploadFile(files[0]);
    data.profileImage = fileURL;

    let savedData = await userModel.create(data);
    return res
      .status(201)
      .send({ status: true, message: "Success", data: savedData });
  } catch (error) {
    res.status(500).send({ status: false, message: error.message });
  }
};

//=======================================login/token generation===============================//

const loginUser = async function (req, res) {
  try {
    let data = req.body;
    let { email, password } = data;
    if (Object.keys(data).length === 0) {
      return res
        .status(400)
        .send({ status: false, message: "Request Body is empty" });
    }
    if (!email) {
      return res
        .status(400)
        .send({
          status: false,
          message: "Email is not present in  request body",
        });
    }
    if (!password) {
      return res
        .status(400)
        .send({
          status: false,
          message: "password is not present in  request body",
        });
    }

    if (!valid.isValidPassword(password)) {
      return res
        .status(400)
        .send({ status: false, message: "password length is not correct" });
    }
    let verifyUser = await userModel.findOne({ email: email });
    if (!verifyUser) {
      return res
        .status(404)
        .send({ status: false, message: "No user found with this email." });
    }

    const comparePassword = await bcrypt.compare(password, verifyUser.password);
    if (!comparePassword)
      return res
        .status(401)
        .send({ status: false, message: "invalid credentials" });
    let token = jwt.sign(
      {
        userId: verifyUser._id.toString(),
        expiresIn: "7d",
      },
      "YousufAbhayRahulAnand"
    );
    return res
      .status(200)
      .send({
        status: true,
        message: "Success",
        data: { userId: verifyUser._id, token: token },
      });
  } catch (error) {
    res.status(500).send({ status: false, message: error.message });
  }
};

//======================================= Update User Data ===============================//
const updateUser = async function (req, res) {
  try {
    let userId = req.params.userId;
    let data = req.body;
    let files = req.files;
    let { fname, lname, email, phone, password } = data;

    if (!valid.isValidRequestBody(data)) {
      return res
        .status(400)
        .send({
          status: false,
          message: "please provide data in request body",
        });
    }

    //--------------------checking User -----------------------//
    if (!valid.isValidObjectId(userId)) {
      return res
        .status(400)
        .send({ status: false, message: "User id is not valid" });
    }
    const checkUser = await userModel.findById(userId);
    if (!checkUser) {
      return res.status(404).send({ status: false, message: "User not found" });
    }

    //----------------------------- Validation Profile Image -----------------------------//
    if (files[0]) {
      let fileURL = await uploadFile(files[0]);
      checkUser.profileImage = fileURL;
    }

    //----------------------------- Validation of fname -----------------------------//
    if (fname) {
      if (!valid.isValidName(fname)) {
        return res
          .status(400)
          .send({ status: false, message: " Fname is Not Valid" });
      }
      checkUser.fname = fname.trim();
    }
    //----------------------------- Validation of lname -----------------------------//
    if (lname) {
      if (!valid.isValidName(lname)) {
        return res
          .status(400)
          .send({ status: false, message: " lname is Not Valid" });
      }
      checkUser.lname = lname.trim();
    }
    //---------------------------Validation of Email----------------------------------------//
    if (email) {
      if (!valid.isValidEmail(email)) {
        return res
          .status(400)
          .send({ status: false, message: " Email is Not Valid" });
      }
      const emailData = await userModel.findOne({ email: email });
      if (emailData) {
        return res
          .status(400)
          .send({ status: false, message: "This Email already exists" });
      }
      checkUser.email = email.trim();
    }
    //---------------------------Validation of Phone Number------------------------------//
    if (phone) {
      if (!valid.isValidMobile(phone)) {
        return res
          .status(400)
          .send({ status: false, message: " Phone Number is Not Valid" });
      }
      const PhoneData = await userModel.findOne({ phone: phone });
      if (PhoneData) {
        return res
          .status(400)
          .send({ status: false, message: "This phone number already exists" });
      }
      checkUser.phone = phone.trim();
    }
    //---------------------------Validation of Password----------------------------------------//
    if (password) {
      if (!valid.isValidPassword(password)) {
        return res
          .status(400)
          .send({ status: false, message: "Password is Not Valid" });
      }
      const saltRounds = 10;
      bcrypt.hash(password, saltRounds, function (err, hash) {
        data.password = hash;
      });
      checkUser.password = password;
    }
    //----------------------------- Validation of Address -----------------------------//

    if (data.address) {
      try {
        parseAddress = JSON.parse(data.address);

        //----------------------Validation of Shipping Address -----------------------------//

        if (parseAddress.shipping) {
          requiredField = ["street", "city", "pincode"];
          for (field of requiredField) {
            if (!parseAddress.shipping[field]) {
              return res
                .status(400)
                .send({
                  status: false,
                  message: `Please provide ${field} key in shipping object in address field`,
                });
            }
          }

          if (parseAddress.shipping.street) {
            if (!valid.isValid(parseAddress.shipping.street)) {
              return res
                .status(400)
                .send({ status: false, message: "Invalid Shipping street" });
            }
          }
          checkUser.address.shipping.street = parseAddress.shipping.street
            

          if (parseAddress.shipping.city) {
            if (!valid.isValid(parseAddress.shipping.city)) {
              return res
                .status(400)
                .send({ status: false, message: "Invalid Shipping city" });
            }
          }
          checkUser.address.shipping.city = parseAddress.shipping.city
            

          if (parseAddress.shipping.pincode) {
            if (!valid.isValidPincode(parseAddress.shipping.pincode)) {
              return res
                .status(400)
                .send({ status: false, message: "Invalid Shipping pincode" });
            }
          }
          checkUser.address.shipping.pincode = parseAddress.shipping.pincode;
        }

        //----------------------------- Validation of Billing Address ------------------------//

        if (parseAddress.billing) {
          requiredField = ["street", "city", "pincode"];
          for (field of requiredField) {
            if (!parseAddress.billing[field]) {
              return res
                .status(400)
                .send({
                  status: false,
                  message: `Please provide ${field} key in billing object in address field`,
                });
            }
          }

          if (parseAddress.billing.street) {
            if (!valid.isValid(parseAddress.billing.street)) {
              return res
                .status(400)
                .send({ status: false, message: "Invalid billing street" });
            }
          }
          checkUser.address.billing.street = parseAddress.billing.street
           

          if (parseAddress.billing.city) {
            if (!valid.isValid(parseAddress.billing.city)) {
              return res
                .status(400)
                .send({ status: false, message: "Invalid billing city" });
            }
          }
          checkUser.address.billing.city = parseAddress.billing.city
            

          if (parseAddress.billing.pincode) {
            if (!valid.isValidpin(parseAddress.billing.pincode)) {
              return res
                .status(400)
                .send({ status: false, message: "Invalid billing pincode" });
            }
          }
          checkUser.address.billing.pincode = parseAddress.billing.pincode;
        }
      } catch (error) {
        return res
          .status(400)
          .send({ status: false, message: "Address should be in Object form" });
      }
    }

    const update = await userModel.findByIdAndUpdate(userId, checkUser, {
      new: true,
    });
    return res
      .status(200)
      .send({ status: true, message: "Success", data: update });
  } catch (error) {
    res.status(501).send({ status: false, message: error.message });
  }
};

//----------------------Get User Details --------------------------------------//

const getUser = async function (req, res) {
  try {
    let data = req.params.userId;
    if (!data) {
      return res
        .status(400)
        .send({ status: false, message: "provided something in params" });
    }
    if (!valid.isValidObjectId(data)) {
      return res
        .status(400)
        .send({ status: false, message: "UserId is invailed" });
    }
    const fetchUser = await userModel.findById(data);
    if (!fetchUser) {
      return res
        .status(404)
        .send({ status: false, message: "User is not found" });
    }
    return res
      .status(200)
      .send({ status: true, message: "Success", data: fetchUser });
  } catch (error) {
    return res.status(500).send({ status: false, message: error.message });
  }
};

module.exports = { createUser, loginUser, updateUser, getUser };
