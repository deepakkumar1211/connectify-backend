import multer from "multer";

// code for multer.distStorage
// const storage = multer.diskStorage({
//     destination: function (req, file, cb){
//         cb(null, "./src/public/temp")
//     },
//     filename: function(req, file, cb){
//         cb(null, file.originalname)
//     }
// })

// export const upload = multer({storage: storage})


// Configure memory storage
const storage = multer.memoryStorage();

export const upload = multer({ storage: storage });