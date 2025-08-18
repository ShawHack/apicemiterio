const multer = require("multer")
const path = require("path")


//destination to store the iamges
const imageStorage = multer.diskStorage({
    destination: function(req,file, cb){

        let folder =""
        if(req.baseUrl.includes ("users")){
            folder = "users"
        }else if(req.baseUrl.includes ("sepultados")){
            folder = "sepultados"
        }

       cb(null, `public/images/${folder}`) 
    },
    filename:function(req,file,cb){
        cb(null, Date.now() +String(Math.random()*1000)  +path.extname(file.originalname))
    },
})

const imageUpload = multer({
    storage : imageStorage,
    fileFilter(req,file,cb){
        // CORREÇÃO: Expressão regular mais robusta para aceitar .jpeg e ser case-insensitive
        // Adicionado \. para garantir que o ponto seja literal
        // Adicionado (png|jpg|jpeg) para incluir jpeg
        // Adicionado i no final para tornar a correspondência case-insensitive (ex: .PNG, .JPG)
        if(!file.originalname.match(/\.(png|jpg|jpeg)$/i)){
         return cb(new Error("Por favor, envie apenas arquivos de imagem nos formatos JPG, JPEG ou PNG."))
        }
        cb(undefined,true)
    }

})

module.exports = {imageUpload}