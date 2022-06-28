const express = require("express");
const router = express.Router();

const templateController = require("../Controller/templateController");

router.get("/get-request", templateController.TemplateGet);
router.post("/post-request", templateController.TemplatePost);
router.put("/put-request", templateController.TemplatePut);


module.exports = router;
