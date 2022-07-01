const express = require("express");
const router = express.Router();

const projectsController = require("../Controller/projectsController");

router.get("/projects", projectsController.GetProjects);

router.get("/projects/:project_id", projectsController.GetSingleProject);

router.get(
  "/projects/:project_id/extensions",
  projectsController.GetExtensions
);

module.exports = router;
