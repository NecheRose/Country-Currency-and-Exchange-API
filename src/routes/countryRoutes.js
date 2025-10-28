import { Router } from "express";
import { refreshCountries, getCountries, getStatus, getSummaryImage, getCountryByName, deleteCountry } from "../controllers/countryController.js";

const countryRouter = Router();

countryRouter
   .get("/status", getStatus)
   .post("/countries/refresh", refreshCountries) // From external API
   .get("/countries", getCountries)  // from DB (Supports filtering & sorting)
   .get("/countries/image", getSummaryImage)
   .get("/countries/:name", getCountryByName)
   .delete("/countries/:name", deleteCountry)


export default countryRouter;
