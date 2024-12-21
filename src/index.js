import dotenv from "dotenv"
import { app } from "./app.js";
import connectDB from "./db/index.js";
import { monitorStoryDeletions } from "./services/storyCleanup.service.js";

// dotenv.config({
//     path: './.env'
// })

dotenv.config()


// Database connection
connectDB()
    .then(() => {
        // Start monitoring story deletions after DB connection
        // monitorStoryDeletions();

        // Start the server
        app.listen(process.env.PORT || 8000, () => {
            console.log(`server is running at port : ${process.env.PORT}`);
        })
    })
    .catch((err) => {
        console.log("Mongo DB connection failed !!!", err);

    })


app.get("/", (req, res) => {
    res.json({
        message: "deepak"
    })
})



