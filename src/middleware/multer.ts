import { User } from '@/models/userModel'
import multer from 'multer'

const storageOfImage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/images/')
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname.split('.')[0] + '-' + Date.now() + '.' + file.originalname.split('.').pop())
  }
})

const storageOfApplication = multer.diskStorage({
  destination: function (req, file, cb) {

    cb(null, 'public/applications/')
  },
  filename: async function (req, file, cb) {
    try {
      const user = await User.findOne({email: req.params.email})
      cb(null, user?.enrollment + '-' + Date.now() + '.' + file.originalname.split('.').pop())
      // cb(null, file.originalname.split('.')[0] + '-' + Date.now() + '.' + file.originalname.split('.').pop())
      
    } catch (error: any) {
      throw new Error(error.message)
    }
  }
})

const storageOfReview = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/reviews/')
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname.split('.')[0] + '-' + Date.now() + '.' + file.originalname.split('.').pop())
  }
})

const storageOfAdditionalDoc = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/additional_doc/')
  },
  filename: async function (req, file, cb) {
    try {
      const user = await User.findOne({email: req.params.email})
      cb(null, user?.enrollment + '-' + Date.now() + '.' + file.originalname.split('.').pop())
    } catch (error: any) {
      throw new Error(error.message)
    }
  }
})

export const upload = multer({
  storage: storageOfImage
})

export const uploadApplication = multer({
  storage: storageOfApplication
})

export const uploadReview = multer({
  storage: storageOfReview
})

export const uploadAddDoc = multer({
  storage: storageOfAdditionalDoc
})