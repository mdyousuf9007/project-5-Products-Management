const productModel = require("../models/productModel");
const valid = require("../validator/validator");
const { uploadFile } = require("../controller/awsController");


var nameRegex = /^[a-zA-Z\s]*$/;
var priceRegex = /^[1-9]\d*(\.\d+)?$/;
var installmentRegex = /\d/;

//---------------------------- Create Product ----------------------------------------------///

const createProduct = async (req, res) => {
  try {
    let data = req.body;
    let {
      title,
      description,
      price,
      currencyId,
      currencyFormat,
      availableSizes,
      style,
      installments,
      isFreeShipping,
    } = data;
    if (Object.keys(data).length === 0) {
      return res
        .status(400)
        .send({ status: false, message: "Request body is empty" });
    }
    let objectCreate = {};

    let requiredField = [
      "title",
      "description",
      "price",
      "currencyId",
      "currencyFormat",
    ];
    for (field of requiredField) {
      if (!data[field]) {
        return res
          .status(400)
          .send({
            status: false,
            message: `${field} is not present in request body`,
          });
      }
    }

    if (!valid.isValid(title))
      return res
        .status(400)
        .send({ status: false, message: "title is invalid" });
    objectCreate.title = title;

    if (!valid.isValid(description))
      return res
        .status(400)
        .send({ status: false, message: "description is invalid" });
    objectCreate.description = description;

    if (priceRegex.test(price) == false)
      return res
        .status(400)
        .send({ status: false, message: "you entered a invalid price" });
    objectCreate.price = price;

    if (!valid.isValid(currencyId))
      return res
        .status(400)
        .send({ status: false, message: "currencyId is invalid" });
    if (!valid.isValid(currencyFormat))
      return res
        .status(400)
        .send({ status: false, message: "currencyFormat is invalid" });
    if (currencyId !== "INR")
      return res
        .status(400)
        .send({ status: false, message: "currencyId format is wrong" });
    objectCreate.currencyId = currencyId;

    let titleVerify = await productModel.findOne({ title: title });
    if (titleVerify) {
      return res
        .status(400)
        .send({ status: false, message: "title is already present" });
    }
    //############################### currencyFormat ##################################//

    let checkCurrencyFormat = "₹";
    if (currencyFormat != checkCurrencyFormat)
      return res
        .status(400)
        .send({
          status: false,
          message:
            "you entered a invalid currencyFormat--> currencyFormat should be ₹",
        });
    objectCreate.currencyFormat = currencyFormat;

    //#######################  image  ####################################//
    let image = req.files;
    if (!image || image.length == 0)
      return res
        .status(400)
        .send({ status: false, message: "Product Image field is Required" });
    let productImage = await uploadFile(image[0]);
    objectCreate.productImage = productImage;

    //##############################  style (if it is present) #####################################//
    if (style) {
      if (nameRegex.test(style) == false)
        return res
          .status(400)
          .send({ status: false, message: "STyle to enterd is invalid" });
      objectCreate.style = style;
    }

    //################################### avalableSizes ##############################################//

    if (!availableSizes) {
      return res
        .status(400)
        .send({ status: false, message: "Available Sizes field is Required" });
    }
    if (availableSizes) {
      if (availableSizes.length === 0) {
        return res
          .status(400)
          .send({
            status: false,
            message: "Available Sizes field is Required 2",
          });
      }

      let checkSizes = ["S", "XS", "M", "X", "L", "XXL", "XL"];
      let arrayOfSizes = availableSizes.split(" ");
      for (let i = 0; i < arrayOfSizes.length; i++) {
        if (checkSizes.includes(arrayOfSizes[i].trim())) continue;
        else
          return res
            .status(400)
            .send({
              status: false,
              message: "Sizes should in this ENUM only S/XS/M/X/L/XXL/XL",
            });
      }
     //checking duplicasy
      let newSize = [];
      for (let j = 0; j < arrayOfSizes.length; j++) {
        if (newSize.includes(arrayOfSizes[j].trim())) continue;
        else newSize.push(arrayOfSizes[j].trim());
      }
      objectCreate.availableSizes = newSize;
    }
    //############################### Free Shipping #################################//

    if (isFreeShipping) {
      isFreeShipping = isFreeShipping.trim();
      isFreeShipping = isFreeShipping.toLowerCase();
      let arr = ["true", "false"];
      if (!arr.includes(isFreeShipping))
        return res
          .status(400)
          .send({ status: false, message: "Free Shipping Must be A Boolean" });
      objectCreate.isFreeShipping = isFreeShipping;
    }
    //####################################  installment (if given)  ######################################//
    if (installments || installments === "") {
      if (!installments)
        return res
          .status(400)
          .send({ status: false, message: "Installment is empty" });
      if (installmentRegex.test(installments) == false)
        return res
          .status(400)
          .send({
            status: false,
            message: "Installment  you entered is invalid",
          });
      objectCreate.installments = installments;
    }
    //---------------------------------------------------------------------------------------
    let productCreate = await productModel.create(objectCreate);
    return res
      .status(201)
      .send({ status: true, message: "Success", data: productCreate });
  } catch (error) {
    res.status(500).send({ status: false, message: error.message });
  }
};

//-------------------------------Get Product By Filter --------------------------------------------//

const getProduct = async (req, res) => {
  try {
    let filter = { isDeleted: false };
    if (req.query.size) {
      if (valid.isValid(req.query.size) && valid.isValidSize(req.query.size)) {
        filter.availableSizes = req.query.size;
      } else {
        return res
          .status(400)
          .send({ status: false, message: "please provide valid size" });
      }
    }

    if (req.query.name) {
      if (valid.isValid(req.query.name) && nameRegex.test(req.query.name)) {
        filter.title = { $regex: req.query.name, $options: "$i" };
      } else {
        return res
          .status(400)
          .send({ status: false, message: "please provide valid name" });
      }
    }

    if (req.query.priceGreaterThan) {
      if (valid.isValidPrice(req.query.priceGreaterThan)) {
        req.query.priceGreaterThan = Number(req.query.priceGreaterThan);
        filter.price = { $gt: req.query.priceGreaterThan };
      } else {
        return res
          .status(400)
          .send({ status: false, message: "please provide valid Price" });
      }
    }

    if (req.query.priceLessThan) {
      if (valid.isValidPrice(req.query.priceLessThan)) {
        req.query.priceLessThan = Number(req.query.priceLessThan);
        if (filter.price) {
          filter.price.$lt = req.query.priceLessThan;
        } else {
          filter.price = { $lt: req.query.priceLessThan };
        }
      } else {
        return res
          .status(400)
          .send({ status: false, message: "please provide valid Price" });
      }
    }

    let savedData;

    if (req.query.priceSort) {
      req.query.priceSort = req.query.priceSort.trim();
      if (["-1", "1"].indexOf(req.query.priceSort) < 0) {
        return res
          .status(400)
          .send({
            status: false,
            message: "please provide valid value in priceSort",
          });
      }
      if (req.query.priceSort == "1") {
        savedData = await productModel.find(filter).sort({ price: 1 });
      } else if (req.query.priceSort == "-1") {
        savedData = await productModel.find(filter).sort({ price: -1 });
      }
    } else {
      savedData = await productModel.find(filter);
    }

    if (savedData.length == 0) {
      return res.status(404).send({ status: false, message: "No data found" });
    }
    return res
      .status(200)
      .send({ status: true, message: "Success", data: savedData });
  } catch (err) {
    res.status(500).send({ status: false, message: err.message });
  }
};

//--------------------------------------- Updates a product --------------------------//

const updateProductById = async function (req, res) {
  try {
    let productId = req.params.productId;
    let data = req.body;
    let files = req.files;
    let {
      title,
      description,
      price,
      currencyId,
      currencyFormat,
      availableSizes,
      style,
      installments,
      isFreeShipping,
    } = data;

    if (Object.keys(data).length === 0) {
      return res
        .status(400)
        .send({ status: false, message: "Request body is empty" });
    }
    let NewObject = {};

    if (!valid.isValidObjectId(productId)) {
      return res
        .status(400)
        .send({ status: false, message: "Product id is not valid" });
    }

    const CheckProduct = await productModel.findOne({
      _id: productId,
      isDeleted: false,
    });
    if (!CheckProduct) {
      return res
        .status(400)
        .send({ status: false, message: "Product is not Find" });
    }

    //----------------------------- Updating title -----------------------------//

    if (title || title === "") {
      title = title.trim();
      if (!valid.isValid(title)) {
        return res
          .status(400)
          .send({ status: false, message: "title is invalid" });
      }

      let titleVerify = await productModel.findOne({ title: title });
      if (titleVerify) {
        return res
          .status(400)
          .send({ status: false, message: "title is already present" });
      }
      NewObject.title = title;
    }

    //----------------------------- Updating description -----------------------------//

    if (description || description === "") {
      description = description.trim();
      if (!valid.isValid(description)) {
        return res
          .status(400)
          .send({ status: false, message: "description is invalid" });
      }
      NewObject.description = description;
    }

    //----------------------------- Updating price -----------------------------//

    if (price || price === "") {
      price = price.trim();
      if (priceRegex.test(price) == false) {
        return res
          .status(400)
          .send({ status: false, message: "you entered a invalid price" });
      }
      NewObject.price = price;
    }

    //----------------------------- Updating currencyId -----------------------------//

    if (currencyId || currencyId === "") {
      currencyId = currencyId.trim();
      if (!valid.isValid(currencyId)) {
        return res
          .status(400)
          .send({ status: false, message: "currencyId is invalid" });
      }
      if (currencyId !== "INR") {
        return res
          .status(400)
          .send({ status: false, message: "currencyId format is wrong" });
      }
      NewObject.currencyId = currencyId;
    }

    //----------------------------- Updating currencyFormat -----------------------------//

    if (currencyFormat || currencyFormat === "") {
      currencyFormat = currencyFormat.trim();
      if (!valid.isValid(currencyFormat)) {
        return res
          .status(400)
          .send({ status: false, message: "currencyFormat is invalid" });
      }
      let checkCurrencyFormat = "₹";
      if (currencyFormat != checkCurrencyFormat) {
        return res
          .status(400)
          .send({
            status: false,
            message:
              "you entered a invalid currencyFormat--> currencyFormat should be ₹",
          });
      }
      Object.currencyFormat = currencyFormat;
    }

    //------------------------------- Updating Product Image -----------------------------//

    if (files && files.length > 0) {
      let safeFile = await uploadFile(files[0]);
      NewObject.productImage = safeFile;
    }

    //----------------------------- Updating style -----------------------------//

    if (style || style === "") {
      style = style.trim();
      if (nameRegex.test(style) == false) {
        return res
          .status(400)
          .send({ status: false, message: "STyle to enterd is invalid" });
      }
      NewObject.style = style;
    }

    //----------------------------- Updating installments -----------------------------//
    if (installments || installments === "") {
      installments = installments.trim();
      if (!installments)
        return res
          .status(400)
          .send({ status: false, message: "Installment is empty" });
      if (installmentRegex.test(installments) == false) {
        return res
          .status(400)
          .send({
            status: false,
            message: "Installment  you entered is invalid",
          });
      }
      NewObject.installments = installments;
    }

    //----------------------------- Updating AvailableSizes -----------------------------//

    if (availableSizes || availableSizes === "") {
      let arr1 = availableSizes.split(" ");
      let checkSizes = ["S", "XS", "M", "X", "L", "XXL", "XL"];

      for (let i = 0; i < arr1.length; i++) {
        if (!checkSizes.includes(arr1[i])) {
          return res
            .status(400)
            .send({
              status: false,
              message: "Sizes should in this ENUM only S/XS/M/X/L/XXL/XL",
            });
        }
      }

      let newSize = [];
      for (let j = 0; j < arr1.length; j++) {
        if (newSize.includes(arr1[j].trim())) continue;
        else newSize.push(arr1[j].trim());
      }
     

      //checking if the element is already present or not in db array pf available sizes
      let dbavailableSizes = CheckProduct.availableSizes;
      for (ele of newSize) {
        let index = dbavailableSizes.indexOf(ele);
        if (index < 0) {
          dbavailableSizes.push(ele);
        } else {
          dbavailableSizes.splice(index, 1);
        }
      }

      NewObject.availableSizes = dbavailableSizes;
    }

    //----------------------- Update iFree Shipping ---------------------------------//

    if (isFreeShipping) {
      isFreeShipping = isFreeShipping.trim();
      isFreeShipping = isFreeShipping.toLowerCase();
      let arr = ["true", "false"];
      if (!arr.includes(isFreeShipping))
        return res
          .status(400)
          .send({ status: false, message: "Free Shipping Must be A Boolean" });
      NewObject.isFreeShipping = isFreeShipping;
    }

    //--------------------------- Updating Product detail in DB -----------------------------//

    const updateProduct = await productModel.findByIdAndUpdate(
      productId,
      NewObject,
      { new: true }
    );
    return res
      .status(200)
      .send({
        status: true,
        message: "Update is successfully",
        data: updateProduct,
      });
  } catch (err) {
    res.status(500).send({ status: false, message: err.message });
  }
};

//-----------------------------Get Product By Id --------------------------------//

const getProductById = async function (req, res) {
  try {
    let productId = req.params.productId;
    if (!valid.isValidObjectId(productId)) {
      return res
        .status(400)
        .send({ status: false, message: "please enter valid productId" });
    }
    let product = await productModel.findOne({
      _id: productId,
      isDeleted: false,
    });

    if (!product) {
      return res
        .status(404)
        .send({ status: false, message: "Product not found" });
    }
    res.status(200).send({ status: true, message: "Success", data: product });
  } catch (err) {
    res.status(500).send({ status: false, message: err.message });
  }
};

//---------------------deleteProduct----------------------------///

const deleteProduct = async function (req, res) {
  try {
    let productId = req.params.productId;

    if (!valid.isValidObjectId(productId)) {
      return res
        .status(400)
        .send({ status: false, message: "please enter valid productId" });
    }

    let product = await productModel.findById(productId);

    if (!product) {
      return res
        .status(404)
        .send({ status: false, message: "Product not found" });
    } else {
      if (product.isDeleted == true)
        return res
          .status(404)
          .send({ status: false, message: "Product Already deleted" });
    }
    await productModel.findByIdAndUpdate(productId, {
      $set: { isDeleted: true, deletedAt: new Date() },
    });
    res
      .status(200)
      .send({ status: true, message: "Product Deleted Successfully" });
  } catch (err) {
    res.status(500).send({ status: false, message: err.message });
  }
};

module.exports = {
  createProduct,
  getProduct,
  updateProductById,
  getProductById,
  deleteProduct,
};
