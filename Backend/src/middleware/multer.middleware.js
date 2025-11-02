import multer from 'multer'

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/temp/')
  },
  filename: function (req, file, cb) {
    // you can add something here to give unique suffix to each file given by the user
    // which will help in the segregation of files
    cb(null, file.originalname)
  }
})

export const upload = multer({ 
  storage
})