const express = require("express");

const router = express.Router();

const ctrl = require("../../controllers/contacts");

const { validateBody } = require("../../utils");

const {schemas} = require("../../models/contact");

const {isValidId, authenticate} = require("../../middlewares")

router.get("/",authenticate, ctrl.getAll);

router.get("/:id",authenticate, isValidId, ctrl.getById);

router.post("/",authenticate, validateBody(schemas.addSchema), ctrl.add);

router.put("/:id",authenticate, isValidId, validateBody(schemas.addSchema), ctrl.updateById);

router.patch("/:id/favorite",authenticate, isValidId, validateBody(schemas.updateFavoriteSchema), ctrl.updateFavorite);

router.delete("/:id",authenticate, isValidId,  ctrl.deleteById);



module.exports = router;
