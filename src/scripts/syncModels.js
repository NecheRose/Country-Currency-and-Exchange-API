import sequelize from "../config/db.js";
import Country from "../models/countryModel.js";


(async () => {
  try {
    await sequelize.authenticate();
    console.log("Database connected!");
    
    // "alter: true" for development
    await Country.sync({ alter: true });
    console.log("Country model synced with database!");   
  } catch (error) {
    console.error("Database sync error:", error);
  } finally {
    await sequelize.close();
  }
}) ();