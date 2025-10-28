import Country from "../models/countryModel.js";
import { Sequelize, Op } from "sequelize";
import axios from "axios";
import fs from "fs";
import path from "path";
import { createCanvas } from "canvas";


// Fetch country from external API, update database & generate summary image
export const refreshCountries = async (req, res) => {
  const COUNTRIES_API = "https://restcountries.com/v2/all?fields=name,capital,region,population,flag,currencies";
  const EXCHANGE_API = "https://open.er-api.com/v6/latest/USD";
  const cacheDir = path.resolve("cache");
  const imagePath = path.join(cacheDir, "summary.png");
  const timestampFile = path.join(cacheDir, "last_refreshed.txt");

  try {
    const [countriesRes, exchangeRes] = await Promise.all([
      axios.get(COUNTRIES_API, { timeout: 15000 }),
      axios.get(EXCHANGE_API, { timeout: 15000 }),
    ]);

    const countriesData = countriesRes.data;
    const exchangeRates = exchangeRes.data?.rates;

    if (!countriesData || !exchangeRates) {
      return res.status(503).json({
        error: "External data source unavailable",
        details: "Could not fetch data from one or more APIs",
      });
    }

    const allCountries = [];

    for (const c of countriesData) {
      const name = c.name?.trim();
      const capital = c.capital || null;
      const region = c.region || null;
      const population = c.population || null;
      const flag_url = c.flag || null;

      const currencies = Array.isArray(c.currencies) && c.currencies.length > 0 ? [c.currencies[0].code] : [];

      let currency_code = null;
      let exchange_rate = null;
      let estimated_gdp = 0;

      if (currencies.length > 0) {
        currency_code = currencies[0];
        exchange_rate = exchangeRates[currency_code] || null;

        if (exchange_rate) {
          const randomMultiplier = Math.floor(Math.random() * 1001) + 1000; // 1000–2000
          estimated_gdp = (population * randomMultiplier) / exchange_rate;
        } else {
          estimated_gdp = null;
        }
      } else {
        currency_code = null;
        exchange_rate = null;
        estimated_gdp = 0;
      }

      // Validation
      if (!name || !population || !currency_code) {
        console.warn(`Skipping invalid country: ${name}`);
        continue;
      }

      allCountries.push({
        name,
        capital,
        region,
        population,
        currency_code,
        exchange_rate,
        estimated_gdp,
        flag_url,
        last_refreshed_at: new Date().toISOString(),
      });
    }

    // Bulk upsert
    await Country.bulkCreate(allCountries, {
      updateOnDuplicate: [
        "capital",
        "region",
        "population",
        "currency_code",
        "exchange_rate",
        "estimated_gdp",
        "flag_url",
        "last_refreshed_at",
      ],
    });

    // Update global timestamp
    const globalTimestamp = new Date();

    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
    fs.writeFileSync(timestampFile, globalTimestamp.toISOString());

    // Generate summary image
    const totalCountries = await Country.count();
    const topCountries = await Country.findAll({
      order: [["estimated_gdp", "DESC"]],
      limit: 5,
    });

    // Create image with canvas
    const canvas = createCanvas(800, 400);
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#101010";
    ctx.fillRect(0, 0, 800, 400);
    ctx.fillStyle = "#ffffff";
    ctx.font = "28px Sans-serif";
    ctx.fillText("🌍 Country Summary Report", 40, 60);
    ctx.font = "22px Sans-serif";
    ctx.fillText(`Total Countries: ${totalCountries}`, 40, 120);

    ctx.font = "20px Sans-serif";
    ctx.fillText("Top 5 Countries by Estimated GDP:", 40, 170);
    let y = 200;
    for (const t of topCountries) {
      ctx.fillText(`${t.name}: ${t.estimated_gdp?.toFixed(2) || "N/A"}`, 60, y);
      y += 30;
    }

    ctx.font = "18px Sans-serif";
    ctx.fillText(`Last Refreshed: ${globalTimestamp.toISOString()}`, 40, 360);

    fs.writeFileSync(imagePath, canvas.toBuffer("image/png"));

    res.setHeader("Content-Type", "image/png");

    return res.json({
      message: "Countries refreshed successfully",
      total_countries: totalCountries,
      last_refreshed_at: globalTimestamp,
    });
  } catch (err) {
    console.error("Refresh error:", err.message);

    if (err.code === "ECONNABORTED" || err.response?.status >= 500) {
      const failedAPI = err.config?.url?.includes("restcountries")
        ? "REST Countries API"
        : "Exchange Rate API";
      return res.status(503).json({
        error: "External data source unavailable",
        details: `Could not fetch data from ${failedAPI}`,
      });
    }

    return res.status(500).json({ error: "Internal server error" });
  }
};


// Get all countries from DB (with optional filters and sorting)
export const getCountries = async (req, res) => {
  try {
    const { region, currency, sort } = req.query;

    const where = {};
    const order = [];

    if (region) where.region = { [Op.like]: `%${region}%` };
    if (currency) where.currency_code = { [Op.like]: `%${currency}%` };

    if (sort) {
      if (sort === "gdp_desc") order.push(["estimated_gdp", "DESC"]);
      else if (sort === "gdp_asc") order.push(["estimated_gdp", "ASC"]);
      else {
        return res.status(400).json({
          error: "Validation failed",
          details: { sort: "Invalid sort option" },
        });
      }
    }

    const countries = await Country.findAll({ where, order });

    if (!countries.length) {
      return res.status(404).json({ error: "No countries found" });
    }

    return res.status(200).json(countries);
  } catch (error) {
    console.error("Error getting countries:", error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Get country by name
export const getCountryByName = async (req, res) => {
  try {
    const { name } = req.params;

    const country = await Country.findOne({ 
      where: Sequelize.where( Sequelize.fn("LOWER", Sequelize.col("name")), name.toLowerCase() ),
    });

    if (!country) {
      return res.status(404).json({ error: "Country not found" });
    }

    return res.status(200).json(country);
  } catch (error) {
    console.error("Error getting country by name:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Delete country by name
export const deleteCountry = async (req, res) => {
  try {
    const { name } = req.params;

    const deletedCount = await Country.destroy({ 
      where: Sequelize.where( Sequelize.fn("LOWER", Sequelize.col("name")), name.toLowerCase() ),
    });

    if (!deletedCount) {
      return res.status(404).json({ error: "Country not found" });
    }

    return res.status(200).json({ message: "Country successfully deleted", deletedCount });
  } catch (error) {
    console.error("Error deleting country:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Show total countries and last refresh timestamp
export const getStatus = async (req, res) => {
  try {
    const total = await Country.count();

    const timestampFile = path.resolve("cache", "last_refreshed.txt");

    let lastRefreshed = null;

    if (fs.existsSync(timestampFile)) {
      lastRefreshed = fs.readFileSync(timestampFile, "utf8");
    }

    return res.status(200).json({
      total_countries: total,
      last_refreshed_at: lastRefreshed || "Not available",
    });
  } catch (error) {
    console.error("Error getting status:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Serve the generated summary image
export const getSummaryImage = (req, res) => {
  const imagePath = path.resolve("cache", "summary.png");

  if (!fs.existsSync(imagePath)) {
    return res.status(404).json({ error: "Summary image not found" });
  }

  return res.sendFile(imagePath);
};



