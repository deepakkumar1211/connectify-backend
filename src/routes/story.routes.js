import { Router } from "express";
import {postStory} from "../controllers/story.controller.js"
import {getStory} from "../controllers/story.controller.js"

import {verifyJWT} from "../middlewares/auth.middleware.js"
import {upload} from "../middlewares/multer.middleware.js"

const router = Router()

router.route("/post-story").post(verifyJWT,
    upload.single("postMedia"), // please give this name (postMedia) during sending request on Postman postMedia: filename.jpg
    postStory
)


router.route("/get-story").get(verifyJWT,getStory)

export default router
