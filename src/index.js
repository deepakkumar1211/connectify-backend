import dotenv from "dotenv"
import { app } from "./app.js";
import connectDB from "./db/index.js";

dotenv.config({
    path: './.env'
})


// Database connection
connectDB()
    .then(() => {
        app.listen(process.env.PORT || 8000, () => {
            console.log(`server is running at port : ${process.env.PORT}`);
        })
    })
    .catch((err) => {
        console.log("Mongo DB connection failed !!!", err);

    })


// app.get("/", (req, res) => {
//     res.json({
//         message: "deepak"
//     })
// })



