require("dotenv").config(); // 🔴 THIS IS REQUIRED

const { defineConfig } = require("@prisma/config");

module.exports = defineConfig({
  datasource: {
    url: process.env.DATABASE_URL,
    directUrl: process.env.DIRECT_URL,
  },

  migrateDatasource: {
    url: process.env.DATABASE_URL,
  },
});
