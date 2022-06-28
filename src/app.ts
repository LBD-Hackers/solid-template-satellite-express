import express from "express";
import morgan from "morgan";
//@ts-ignore
import {setSatellite, extractWebId } from "express-solid-auth-wrapper";

const TemplateRouter = require("./Router/templateRouter");

// Express Interfaces for TypeScript

interface Error {
  status?: number;
  code?: number;
}

interface Request {
  status?: number;
  code?: number;
}

interface Response {
  status?: number;
  code?: number;
}

// These variables have to be set up in a nodemon.json
// if this file does not exist create it in the upmost directory
const config = {
  "refreshToken" : process.env.CONFIG_REFRESH_TOKEN,
  "clientId"     : process.env.CLIENT_ID,
  "clientSecret" : process.env.CLIENT_SECRET,
  "oidcIssuer"   : process.env.OIDC_ISSUER,
}

const app = express();

app.use(morgan("dev"));

// Adjust the limits for your needs
app.use(express.urlencoded({ limit: "5mb", extended: false }));
app.use(express.json({ limit: "200mb" }));
app.use(express.json());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  if (req.method === "OPTIONS") {
    res.header("Access-Control-Allow-Methods", "PUT, POST, PATCH, DELETE, GET");
    return res.status(200).json({});
  }
  next();
});

// Set up the connection to Solid
app.use(setSatellite(config));
app.use(extractWebId);

// Routes which should handle requests
app.use("/template", TemplateRouter);

// Error Handlers
app.use((req, res, next) => {
  const error = new Error ("Not found");
  res.status(500).send(error.message);
});

module.exports = app;
