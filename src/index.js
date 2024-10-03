require('dotenv').config({path: './env'})

import connectDB from "./db/index.js";


// Database connection
connectDB();
