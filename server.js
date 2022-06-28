const express = require('express')
const mongoose = require('mongoose')
require('dotenv').config()
const multer = require('multer')
const bcrypt = require('bcrypt')
const FileModel = require('./models/File')

const app = express()

const upload = multer({
  dest: 'uploads'
})

mongoose.connect(process.env.MONGODB_URI, () => {
  console.log(`MongoDB connected`);
})

app.set('view engine', 'ejs')
app.use(express.static('public'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.get('/', (req, res) => {
  res.render('index')
})

app.post('/upload', upload.single('file'), async (req, res) => {
  const fileData = {
    path: req.file.path,
    originalName: req.file.originalname,
  }

  if(req.body.password != null && req.body.password !== '') {
    fileData.password = await bcrypt.hash(req.body.password, 10)
  }

  const file = await FileModel.create(fileData)
  res.render('index', { fileLink: `${req.headers.origin}/file/${file._id}` })
})

app.route('/file/:id')
  .get(handleDownload)
  .post(handleDownload)

async function handleDownload(req, res) {
  const file = await FileModel.findById(req.params.id)

  if(file.password != null) {
    if(req.body.password == null) {
      res.render('password')
      return
    }

    if(!await bcrypt.compare(req.body.password, file.password)) {
      res.render('password', { error: true })
      return
    }
  }

  file.downloadCount++
  await file.save()

  res.download(file.path, file.originalName)
}

const PORT = process.env.PORT || 5000

app.listen(PORT, () => console.log(`Server listen on port ${PORT}`))
