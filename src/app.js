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


// routes import
import userRouter from "./routes/user.routes.js"
// aisa manchaha name tabhi de sakte hai jab export default ho


// routes.declaration
app.use("/api/v1/users", userRouter)

//https://localhost:8000/api/v1/users/register
//https://localhost:8000/api/v1/users/login


// import post routes
import postRouter from "./routes/post.routes.js"
app.use("/api/v1/posts", postRouter)

app.get("/", (req, res) => {
    res.json({
        message: "deepak"
    })
})


export { app }