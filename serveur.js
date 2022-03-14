const http = require("http");
const express = require("express");
const cors = require('cors')
const app = express();
app.use(cors())
app.use(express.json())
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Joi = require('joi');
const { v4: uuid } = require("uuid");

/**
 * Import MongoClient & connexion à la DB
 */
mongoose.connect('mongodb+srv://prince:prince123@cluster0.g1sqx.mongodb.net/nc-chat?retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log("Database connection Success.");
})
.catch((err) => {
  console.error("Mongo Connection Error", err);
});

const userSchema = new Schema(
  {
    id: { type: String, unique: true, required: true },
    name: { type: String },
    email : {type : String},
    avatar: { type: String },
  },
  {
    timestamps: {
        createdAt: "createdAt",
        updatedAt: "updatedAt",
    },
    versionKey: false
  }
);

const MessageSchema = new Schema(
  {
    id: { type: String, unique: true, required: true },
    user: { type: String },
    name: { type: String },
    room : {type : String},
    text : {type : String},
  },
  {
    timestamps: {
        createdAt: "createdAt",
        updatedAt: "updatedAt",
    },
    versionKey: false
  }
);

const Users = mongoose.model("users", userSchema);
const Messages = mongoose.model("messages", MessageSchema);

app.get('/users', async (req,res) => {
  try {
      const docs = await Users.find()
      res.status(200).json(docs)
  } catch (err) {
      console.log(err)
      throw err
  }
})

app.post("/users", async (req, res) => {
  const newUser = new Users({
    id :  uuid(),
    name : req.body.name,
    email : req.body.email
  })
  const user = await Users.findOne({name:newUser.name,email:newUser.email})
  if(!user){
    await newUser.save()
    res.status(200).json(newUser)
  }else{
    res.status(200).json(user)
  }
})

app.get('/users/:id', async (req,res) => {
  try {
      const id = req.params.id
      const docs = await Users.findOne(id)
      res.status(200).json(docs)
  } catch (err) {
      throw err
  }
})

app.get('/messages/:room', async (req,res) => {
  try {
    const room = req.params.room
    const docs = await Messages.find({room:room})
    res.status(200).json(docs)
  } catch (err) {
      console.log(err)
      throw err
  }
})

app.post("/messages", async (req, res) => {
  const newMessage = new Messages({
    id :  uuid(),
    user : req.body.name,
    name : req.body.name,
    room : req.body.room,
    text : req.body.text,
  })

  try {
    await newMessage.save()
    res.status(200).json(newMessage)
  } catch (err) {
    res.status(500).json({message:"mesage saving false"})
  }

})

//  const { MongoClient, ServerApiVersion } = require('mongodb');
//  const uri = "mongodb+srv://prince:prince123@cluster0.g1sqx.mongodb.net/Cluster0?retryWrites=true&w=majority";
//  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
//  console.log('Prince',client)
 
//  client.connect(err => {
//     console.log('Prince',err)
//     const users = client.db("nc-chat").collection("users");

//     app.get('/users', async (req,res) => {
//       try {
//           const docs = await users.find({}).toArray()
//           res.status(200).json(docs)
//       } catch (err) {
//           console.log(err)
//           throw err
//       }
//     })
    
//     app.get('/users/:id', async (req,res) => {
//       const id = parseInt(req.params.id)
//       try {
//           const docs = await users.find({id}).toArray()
//           res.status(200).json(docs)
//       } catch (err) {
//           console.log(err)
//           throw err
//       }
//     })
    
//     app.post("/users", (req, res) => {
//       const newUser = {
//         id : req.body.id,
//         name : req.body.id
//       }
//       const user = users.find({id})
//       if(user){
    
//         users.collection('users').insertOne(newUser, (err, result) => {
//           if (err) {
//             console.error(err)
//             res.status(500).json({ err: err })
//             return
//           }
//           console.log(result)
//           res.status(200).json({ ok: true })
//         })
//       }else{
//         res.status(200).json({ ok: true })
    
//       }
//     })
//     client.close();
//  });
const server = http.createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true,
  },
});
const { addUser, removeUser } = require("./dummyuser");

const PORT = 5000;

io.on("connection", (socket) => {
  socket.on("join", ({name,room}, callBack) => {
    console.log(name,room)
    const { user, error } = addUser({ id: socket.id, name, room });
    if (error) return callBack(error);

    socket.join(user.room);
    // socket.emit("message", {
    //   user: "Admin",
    //   text: `Welocome to ${user.room}`,
    // });

    // socket.broadcast
    //   .to(user.room)
    //   .emit("message", { user: "Admin", text: `${user.name} has joined!` });
    // callBack(null);

    socket.on("sendMessage", ({ message }) => {
      io.to(user.room).emit("message", {
        user: user.name,
        text: message,
      });
    });
  });
 
  socket.on("disconnect", () => {
    const user = removeUser(socket.id);
    if(user){
      io.to(user.room).emit("message", {
        user: "Admin",
        text: `${user.name} just left the room`,
      });
      console.log("A disconnection has been made");
    }
  });
});

server.listen(process.env.PORT || PORT, () => console.log(`Server is connected to Port ${PORT}`));