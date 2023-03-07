const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();

// dotenv config require;
require('dotenv').config();


const port = process.env.PORT || 5000;

// middleware;
app.use(cors());
app.use(express.json());

// mongo db server api start ;


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.0y4d7qh.mongodb.net/?retryWrites=true&w=majority`;
// console.log(uri)
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


// verifyJWT and middleware ;
function verifyJWT(req, res, next) {
  console.log('token inside verifyJWT', req.headers.authorization);
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send('unauthorized access')
  }

  const token = authHeader.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: 'forbidden access from JWT' })
    }
    req.decoded = decoded;
    console.log(req.decoded)
    next()
  })
}



async function run() {

  try {
    const usersCollection = client.db('sikFurniture').collection('users');
    const productsCollection = client.db('sikFurniture').collection('products');
    const bookingsCollection = client.db('sikFurniture').collection('bookings');


    // verify Admin middleware
    const verifyAdmin = async (req, res, next) => {
      // console.log('inside verifyAdmin', req.decoded.email);
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);

      if (user?.role !== 'admin') {
        return res.status(403).send({ message: 'forbidden access From Admin' })
      }
      next();
    }

    // verify Seller middleware
    const verifySeller = async (req, res, next) => {
      // console.log('inside verifySeller', req.decoded.email);
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);

      if (user?.role !== 'seller') {
        return res.status(403).send({ message: 'forbidden access From Seller' })
      }
      next();
    }




    // products get API here 
    app.get('/products/:id', async (req, res) => {
      const id = req.params.id;
      const query = { categoryId: id }
      const products = await productsCollection.find(query).toArray();
      res.send(products)
    });

    // target seller products get API here 
    app.get('/products',verifyJWT, verifySeller,  async (req, res) => {
      const email = req.query.email;
      // console.log('target seller api', email)
      const query = { sellerEmail: email }
      const products = await productsCollection.find(query).toArray();
      res.send(products)
    });

    // products post API here
    app.post('/products', verifyJWT, async (req, res) => {
      const product = req.body;
      const result = await productsCollection.insertOne(product)
      res.send(result)
    });

    // seller product  delete  API;
    app.delete('/products/:id', verifyJWT, verifySeller, async (req, res) => {
      const id = req.params.id;
      // console.log('product delete API ', id)
      const filter = { _id: ObjectId(id) };
      const result = await productsCollection.deleteOne(filter);
      res.send(result);
    });





    // bookings API here;
    // booking GET API 
    app.get('/bookings', verifyJWT, async (req, res) => {
      const email = req.query.email;

      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ message: 'forbidden access ' })
      }
      // console.log('token', req.headers.authorization)
      const query = { email: email };
      const bookings = await bookingsCollection.find(query).toArray();
      res.send(bookings);
    })



    // bookings Post API 
    app.post('/bookings', verifyJWT, async (req, res) => {
      const booking = req.body;
      const result = await bookingsCollection.insertOne(booking);
      res.send(result)
    });


    /// JWT API
    app.get('/jwt', async (req, res) => {
      const email = req.query.email;
      const query = { email: email }
      const user = await usersCollection.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '10h' });
        return res.send({ accessToken: token });
      }
      // console.log(user);
      res.status(403).send({ accessToken: '' })
    })

    // admin get API check  
    app.get('/users/admin/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isAdmin: user?.role === 'admin' })
    });


    // seller get API check  
    app.get('/users/seller/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isSeller: user?.role === 'seller' })
    });


    // user post API  is here;
    app.post('/users', async (req, res) => {
      const user = req.body;
      // console.log(user)
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // buyers get API 
    app.get('/buyers', verifyJWT, verifyAdmin, async (req, res) => {
      const query = { role: 'buyer' };
      const buyers = await usersCollection.find(query).toArray();
      res.send(buyers);
    });

    // delete Buyer API;
    app.delete('/buyers/:id', verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      // console.log('buyers delete ', id)
      const filter = { _id: ObjectId(id) };
      const result = await usersCollection.deleteOne(filter);
      res.send(result);
    });


    // seller get API 
    app.get('/sellers', verifyJWT, verifyAdmin, async (req, res) => {
      const query = { role: 'seller' };
      const buyers = await usersCollection.find(query).toArray();
      res.send(buyers);
    });

    // delete seller API;
    app.delete('/sellers/:id', verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      // console.log('buyers delete ', id)
      const filter = { _id: ObjectId(id) };
      const result = await usersCollection.deleteOne(filter);
      res.send(result);
    })






  }
  finally {

  }
}
run().catch(console.log());


// basic server req, res, app.listen;

app.get('/', (req, res) => {
  res.send('SIK Furniture Server is Running');
});

app.listen(port, () => console.log(`SIK Furniture server running on port ${port}`));

