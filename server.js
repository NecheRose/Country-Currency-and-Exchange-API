import express from "express";
import dotenv from "dotenv";
import sequelize from "./src/config/db.js";
import cors from "cors";
import countryRouter from "./src/routes/countryRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Test database connection on startup
async function initializeDatabase() {
  try {
    await sequelize.authenticate();
    console.log("Database connected successfully!");
  } catch (error) {
    console.error("Database connection failed:", error.message);
    console.error("Server will continue but database operations will fail");
    // exit if database is critical
    process.exit(1);
  }
};

// Middleware
app.use(cors());
app.use(express.json());

// Route
app.use("/", countryRouter);

// Database health check endpoint 
app.get("/health", async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ 
      status: "healthy", 
      database: "connected",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({ 
      status: "unhealthy", 
      database: "disconnected",
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Home page
app.get("/", (req, res) => {
  return res.send({
    message: "Welcome to my server!"
  })
});

// Start server with database check
initializeDatabase().then(() => {
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
});