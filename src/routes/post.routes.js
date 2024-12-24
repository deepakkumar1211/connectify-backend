import { Router } from "express";
import {getAllPosts, createPost, deletePost} from "../controllers/post.controller.js"

import {verifyJWT} from "../middlewares/auth.middleware.js"
import {upload} from "../middlewares/multer.middleware.js"

const router = Router()

router.route("/create-post").post(
    verifyJWT,
    upload.array("postMedia", 10), // Accept up to 10 files with the key "postMedia", // please give this name (postMedia) during sending request on Postman postMedia: filename.jpg
    createPost
)


router.route("/get-all-posts").get(getAllPosts)

// Route to delete a specific story by ID
router.route("/delete-post/:postId").delete(verifyJWT, deletePost);

export default router
