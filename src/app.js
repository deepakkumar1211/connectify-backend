import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser";


const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

// fix the size of json
app.use(express.json({limit: "16kb"}))

// for encodeing url
app.use(express.urlencoded({extended: true, limit: "16kb"}))

// public assests any can use it (public folder)
app.use(express.static("public"))

app.use(cookieParser())


export { app }