var http = require("http"); 
var express = require("express");
const app = express();
process.title = "node-easyrtc";
require('ssl-root-cas').inject();
require('https').globalAgent.options.ca = require('ssl-root-cas/latest').create();
const Multer = require('multer');
const {Storage} = require('@google-cloud/storage');
var firebase = require("firebase-admin");
var serviceAccount = require("./adminsdk.json");
const stream = require('stream');
const multer = Multer({
    storage: Multer.memoryStorage(),
    limits: {
      fileSize: 15 * 1024 * 1024 // no larger than 5mb, you can change as needed.
    }
  });
  const storage = new Storage({
    projectId: "fir-auth-11fc1",
    keyFilename: "./adminsdk.json"
  });
const bucket = storage.bucket("fir-auth-11fc1.appspot.com");

firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
  databaseURL: "https://fir-auth-11fc1.firebaseio.com",
  storageBucket: "fir-auth-11fc1.appspot.com",
});
//const bucket = storage.bucket(process.env.GCLOUD_STORAGE_BUCKET_URL);

const Blowfish = require('javascript-blowfish').Blowfish;
var bf = new Blowfish('qscvgyeripdnsqw');
var file_encrypt_key = 'qscvgyeripdnsqwqscvgyeripdnsqw'
const Encryption = require('node_triple_des');


const { stat, chown, lstat } = require("fs");
var port = process.env.PORT || 8080;
app.use(express.static("public"));

var bodyParser = require('body-parser');
const { promises } = require("dns");
const { resolve } = require("path");
app.use(bodyParser.json({ limit: "50mb" }))
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true, parameterLimit: 50000 }))

app.get("/", function(request, response) {
    response.sendFile(__dirname + "/public/login.html");
})

app.get("/signup", function(request, response) {
    response.sendFile(__dirname + "/public/signup.html");
})

app.get("/dash", function(request, response) {
    response.sendFile(__dirname + "/public/dash.html");
})
app.get("/myfiles", function(request, response) {
    response.sendFile(__dirname + "/public/files.html");
})
app.get("/fileupload", function(request, response) {
    response.sendFile(__dirname + "/public/fileupload.html");
})
app.get("/sharefile", function(request, response) {
  response.sendFile(__dirname + "/public/sharedfiles.html");
})

app.post("/register", function(request, response) {
    var obj = request.body;

    var encrypted =  bf.base64Encode(bf.encrypt(obj.password));
    var ref = firebase.database().ref("users/").push({
        name:obj.name,
        email:obj.email,
        password:encrypted
    })
    response.send("sucess");
})


app.post("/checklogin", function(request, response) {
    var obj = request.body;
    var status="0";
    var ref = firebase.database().ref("users/");
    ref.once("value",function(snap){
        snap.forEach(function(child){
            console.log(child.val());
            if(child.val().email===obj.email){
                status="1";
               var encrypted =  bf.base64Encode(bf.encrypt(obj.password));
                if(encrypted===child.val().password){
                    status=child.key;
                }
            }
        })
        console.log(status);
        response.send(status);
    })
    
})

app.get("/sharedfiles",async function(req,res){

  var obj=[];
  
  var ref = firebase.database().ref("users/"+req.query.id+"/shared");
  ref.once("value",function(snap){
    var data = snap.val();
    firstayer(data).then(res1=>{
     res.send(res1);
    })
  })

  
   
});
 const firstayer = (data) =>{
  var promises=[];
  return new Promise((resolve, reject) => {

    var keys = Object.keys(data);
    for(i in keys){
      var inner_keys = Object.keys(data[keys[i]]);
      promises.push(uploadImageToStorage(keys[i],inner_keys));
    }

    Promise.all(promises)    
 .then(function(data){ resolve(data) })
 .catch(function(err){ /* error handling */ });
  })
 }
const uploadImageToStorage = (id,inner_keys) => {
  var obj=[];
  var promises=[];
  return new Promise((resolve, reject) => {
      for(j in inner_keys){
        promises.push(getfile(id,inner_keys[j]));
     }

     Promise.all(promises)    
 .then(function(data){ 
   resolve(data); 
  })
 .catch(function(err){ /* error handling */ });
    
  })
}

const getfile = async (id,file_id) =>{
  return new Promise((resolve, reject) => {
    var ref1 = firebase.database().ref("users/"+id+"/files/"+file_id);
      ref1.once('value',function(last){
        obj = {
        name:last.val().name,
        fileid:last.key,
        size:last.val().size,
        url:last.val().url,
        userid:id
      }
    }).then(function(){
      resolve(obj);
    })
  });
  
}

app.post("/sharefiles",function(request, response){
  var obj = request.body;
  var a = obj.user.split(",");
  for(i in a){
    firebase.database().ref("users/"+obj.id+"/files/"+obj.file+"/share/"+a[i]).set({
      status:'shared' 
    }).then(function(){
      firebase.database().ref("users/"+a[i]+"/shared/"+obj.id+'/'+obj.file).set({
         status:'shared'
      }).then(function(){
        response.send("2");
      })
    })
  }
  
});

app.get("/userlist",function(req,res){

  var obj=[];
  var ref = firebase.database().ref("users/");
  ref.once('value',function(child){
    child.forEach(function(snap){
      if(snap.key!==req.query.id){
        obj.push({
          key:snap.key,
          email:snap.val().email
        })
      }
    })
    res.send(obj);
  })
  
})

app.get("/fileslist",function(req,res){

  var ref = firebase.database().ref("users/"+req.query.id+"/files");
  ref.once('value',function(child){
    res.send(child.val());
  })
  //res.send("Gre");
})


app.post("/uploading", multer.single('file'), function(request, response) {
    var obj = request.body;
    var i=0;
    for(i in obj.data){
          var key = firebase.database().ref("users/"+obj.id+"/files").push({
            name:obj.data[i].name,
            url:obj.data[i].data,
            size:obj.data[i].size,
            type:obj.data[i].type
          })
    }
    response.send("2");
})

const uploadImage = (data,name)=>{
  return new Promise((resolve,reject)=>{
      
      const image =  data;
      //Encryption.encrypt(file_encrypt_key,data);
      //image = encrypt;

      const mimeType = image.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/)[1]
      const fileName =  name
      const base64EncodedImageString = image.replace(/^data:image\/\w+;base64,/, '')
      const imageBuffer = Buffer.from(base64EncodedImageString, 'base64');
      const bufferStream = new stream.PassThrough();
      bufferStream.end(imageBuffer);
      const file = bucket.file('images/' + fileName);
      bufferStream.pipe(file.createWriteStream({
          metadata: {
            contentType: mimeType
           },
          public: true,
         validation: "md5"
      }))
    .on('error', function (err) {
    console.log('error from image upload', err);
    })
    .on('finish', function () {
       // The file upload is complete.
       file.getSignedUrl({
       action: 'read',
       expires: '03-09-2491'
    }).then(signedUrls => {
       // signedUrls[0] contains the file's public URL
        pictureURL = signedUrls[0]
        console.log(pictureURL);
        resolve(pictureURL);
        });
      });
  })
}

var server=http.createServer(app);
server.listen(port, function () {
    console.log('listening on http://localhost:' + port);
});