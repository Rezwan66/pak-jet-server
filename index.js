const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

// Load environment variables
dotenv.config();

const stripe = require('stripe')(process.env.PAYMENT_GATEWAY_KEY);

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zjzxbzp.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const db = client.db('pakjetDB');
    const parcelCollection = db.collection('parcels');

    // GET: get all parcels
    // app.get('/parcels', async (req, res) => {
    //   const parcels = await parcelCollection.find().toArray();
    //   res.send(parcels);
    // });
    //GET: a percel
    app.get('/parcels', async (req, res) => {
      try {
        const userEmail = req.query.email;
        const query = userEmail ? { created_by: userEmail } : {};
        const options = {
          sort: { creation_date: -1 }, // newest first
        };
        const parcels = await parcelCollection.find(query, options).toArray();
        res.send(parcels);
      } catch (error) {
        console.error('Error fetching parcels: ', error);
        res.status(500).send({ message: 'Failed to get parcel' });
      }
    });
    // GET: a parcel
    app.get('/parcels/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const parcel = await parcelCollection.findOne({
          _id: new ObjectId(id),
        });
        if (!parcel) {
          return res.status(404).send({ message: 'Parcel not found' });
        }
        res.send(parcel);
      } catch (error) {
        console.log('Error fetching parcel: ', error);
        res.status(500).send({ message: 'Failed to fetch parcel' });
      }
    });
    // POST: create a parcel
    app.post('/parcels', async (req, res) => {
      try {
        const newParcel = req.body;
        const result = await parcelCollection.insertOne(newParcel);
        res.status(201).send(result);
      } catch (error) {
        console.error('Error inserting parcel: ', error);
        res.status(500).send({ message: 'Failed to create parcel' });
      }
    });
    // DELETE: a parcel
    app.delete('/parcels/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const result = await parcelCollection.deleteOne({
          _id: new ObjectId(id),
        });
        //    if(result.deletedCount===0){
        //     return res.status(404).send({message: 'Parcel not found'})
        //    }
        res.send(result);
      } catch (error) {
        console.log('Error deleting parcel:', error);
        res.status(500).send({ message: 'Failed to delete parcel' });
      }
    });

    // STRIPE: Payment
    app.post('/create-payment-intent', async (req, res) => {
      const { amountInCents, parcelId } = req.body;
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Number(amountInCents), // amount in cents
          currency: 'eur',
          // Configure according to your needs
          payment_method_types: ['card'],
          // Optional metadata
          metadata: {
            order_id: parcelId,
          },
        });
        res.json({ clientSecret: paymentIntent.client_secret });
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });

    // Send a ping to confirm a successful connection
    await client.db('admin').command({ ping: 1 });
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// Basic route
app.get('/', (req, res) => {
  res.send('PakJet Server is running 🚀');
});

// Start server
app.listen(port, () => console.log(`✅ Server listening on port ${port}`));
