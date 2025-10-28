# 🌍 Country Currency & Exchange API

A RESTful API service built with **Node.js, Express and mySQL**, that fetches country data and exchange rates from external APIs, caches them in a MySQL database, and provides comprehensive CRUD operations with filtering and sorting capabilities.
This project forms the **Stage 2 Backend Task** for the **HNG Internship**, demonstrating proficiency in API integration, database persistence, data transformation, and clean RESTful API design.

---

## 📖 Table of Contents

- [Overview](##overview)
- [Key Features](##key-features)
- [Architecture](##architecture)
- [Tech Stack](##tech-stack)
- [Setup Instructions](##setup-instructions)
- [API Endpoints](##api-endpoints)
- [Error Handling](##error-handling)

---

## 🧩 Overview

The **Country Currency & Exchange API** fetches country data from the [REST Countries API](https://restcountries.com/v2/all?fields=name,capital,region,population,flag,currencies) and currency exchange rates from the [Open Exchange Rate API](https://open.er-api.com/v6/latest/USD).

It then:
- Combines both datasets.
- Calculates a random `estimated_gdp` for each country.
- Stores or updates the data in a **MySQL** database as cached information.
- Provides endpoints for CRUD operations, filtering, sorting, and even image generation summarizing key statistics.

---

## 🔑 Key Features 

✅ **Fetch and cache country data from RestCountries API**
✅ **Retrieve real-time exchange rates from Exchange Rate API**
✅ **Calculate estimated GDP for each country**
✅ **Generate visual summary images with top 5 countries**
✅ **Full CRUD operations with filtering and sorting**
✅ **Comprehensive error handling and validation**
✅ **Efficient MySQL database caching**

---

## 🏗️ Architecture
```
Country-Currency-and-Exchange-API/
├── config/                      # MySQL connection config
│ └── db.js                      
├── controllers/                 # Core logic
│ └── countryController.js
├── models/                      # Database schemas
│ └── countryModel.js            
├── routes/                      # Routes
│ └── countryRoutes.js           
├── services/                    # Handles external API logic
│ ├── countryService.js          
│ ├── exchangeService.js
│ └── imageService.js            # Generates summary image
├── cache/
│ └── summary.png                # Generated image
├── app.js
└── server.js
```
---

## 🧰 Tech Stack

- **Runtime:** Node.js 
- **Framework:** Express
- **Database:** MySQL
- **ORM / Query Builder:** Sequelize or native `mysql2`
- **Image Generation:** node-canvas
- **Environment Variables:** dotenv

---

## 🚀 Setup Instructions

### 📋 Prerequisites
Before you begin, ensure you have the following installed:

- **Node.js (v14 or higher)**
- **MySQL (v5.7 or higher)** 
- **npm or yarn package manager**

### 1. Clone the Repository
```bash
git clone https://github.com/<your-username>/country-currency-exchange-api.git
cd country-currency-exchange-api
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the root directory:

```
# Server Configuration
PORT=5000

# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=country_exchange_db
```

### 4. Setup the Database
Create the database manually or via MySQL CLI

```sql
CREATE DATABASE country_exchange_db;
```

### 5. Start the Server

```bash
npm start
```
`For development with auto-restart:`

```bash
npm run dev
```
The server will start on http://localhost:3000 (or your configured PORT).

### 📦 Dependencies

```json
{
  "axios": "^1.12.2",
  "canvas": "^3.2.0",
  "cors": "^2.8.5",
  "dotenv": "^17.2.3",
  "express": "^5.1.0",
  "mysql2": "^3.15.3",
  "sequelize": "^6.37.7"
}
```

---

## 🌐 API Endpoints

1. 🔄 **POST** `/countries/refresh`
Fetch all countries and exchange rates, then cache them in the database

**Response (200 Ok):**

```json
{
  "message": "Countries data refreshed successfully",
  "total_countries": 250,
  "last_refreshed_at": "2025-10-22T18:00:00.000Z"
}
```

**Error Response (503):**

```json
{
  "error": "External data source unavailable",
  "details": "Could not fetch data from RestCountries API"
}
```

---

2. 📄 **GET** `/countries`
Get all countries from the DB (supports filters and sorting) such as `?region=Africa` | `?currency=NGN` | `?sort=gdp_desc`

**Query Parameters:**
- ?region=Africa
- ?currency=NGN
- ?sort=gdp_desc or ?sort=gdp_asc

**Sample `GET` Request**
`GET /countries?region=Africa`

**Response:**

```json
[
  {
    "id": 1,
    "name": "Nigeria",
    "capital": "Abuja",
    "region": "Africa",
    "population": 206139589,
    "currency_code": "NGN",
    "exchange_rate": 1600.23,
    "estimated_gdp": 25767448125.2,
    "flag_url": "https://flagcdn.com/ng.svg",
    "last_refreshed_at": "2025-10-22T18:00:00Z"
  }
]
```

---

3. 📍 **GET** `/countries/:name`
Get details of a specific country (case-insensitive).

**Example Request:**
```bash
GET /countries/Ghana
```

**Response:**

```json
{
  "id": 2,
  "name": "Ghana",
  "capital": "Accra",
  "region": "Africa",
  "population": 31072940,
  "currency_code": "GHS",
  "exchange_rate": 15.34,
  "estimated_gdp": 3029834520.6,
  "flag_url": "https://flagcdn.com/gh.svg",
  "last_refreshed_at": "2025-10-22T18:00:00Z"
}
```

---

4. ❌ **DELETE** `/countries/:name`
Deletes a specific country record.

**Example Request:**
```bash
DELETE /countries/Ghana
```

**Response:**
```json
{
  "message": "Country deleted successfully"
}
```

---

5. 📊 **GET** `/status`
Check the total number of countries and last refresh timestamp.

**Response:**

```json
{
  "total_countries": 250,
  "last_refreshed_at": "2025-10-22T18:00:00.000Z"
}
```

---

6. 🖼️ **GET** `/countries/image`
Serves the summary image with top countries by GDP generated after `/countries/refresh` 

**Response:** PNG image file containing:

```
Total Countries: 250
Top 5 by GDP:
1. Nigeria
2. USA
3. Germany
...
Refreshed: 2025-10-22 18:00:00
```

**Error Response (404):**
```json
{ 
  "error": "Summary image not found" 
}
```

---

## ⚠️ Error Handling
The API returns consistent JSON error responses:

| Status Code| Error Type            | Example Response                                                |
|------------|-----------------------|-----------------------------------------------------------------|
| 400        | Bad Request           | {"error": "Validation failed", "details": {...}}                |
| 404        | Not Found             | {"error": "Country not found"}                                  | 
| 500        | Internal Server Error | {"error": "Internal server error"}                              | 
| 503        | Service Unavailable   | {"error": "External data source unavailable", "details": "..."} |

---

🤝 Contributing
This is a submission project for HNG Internship. For educational purposes, feel free to fork and experiment.
