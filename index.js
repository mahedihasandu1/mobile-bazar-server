const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 5000
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const stripe = require("stripe")(process.env.STRIPE_KEY);

const app = express();

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.USER}:${process.env.PASSWORD}@cluster0.3dm7fqv.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

// varifytokenjtw
function verifyJWT(req, res, next) {
    console.log('token', req.headers.authorization)
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('unauthorized access')

    }
    const token = authHeader.split(' ')[1]
    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next();
    })
}




async function run() {
    try {
        const categoryCollection = client.db('mobileBazar').collection('category')
        const usersCollection = client.db('mobileBazar').collection('users')
        const productsCollection = client.db('mobileBazar').collection('allProducts')
        const adsCollection = client.db('mobileBazar').collection('adsData')
        const bookingCollection = client.db('mobileBazar').collection('bookProduct')
        const reportCollection = client.db('mobileBazar').collection('reportedProduct')
        const paymentsCollection = client.db('mobileBazar').collection('payments')


        const verifyAdmin = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const filter = { email: decodedEmail };
            const user = await usersCollection.findOne(filter);
            if (user?.role !== 'Admin') {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next()
        }
        const verifySeller = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const filter = { email: decodedEmail };
            const user = await usersCollection.findOne(filter);
            if (user?.userType !== 'Seller') {
                return res.status(403).send({ message: 'forbidden access' })
            }

            next()
        }
        // category

        app.get('/category', async (req, res) => {
            const query = {};
            const result = await categoryCollection.find(query).toArray()
            res.send(result)
        });

        app.get('/category/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) };
            const result = await categoryCollection.findOne(query)
            res.send(result)
        });
        app.get('/users', async (req, res) => {
            let query = {}
            if (req.query.userType) {
                query = { userType: req.query.userType }
            }
            const result = await usersCollection.find(query).toArray()
            res.send(result)
        });
        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await usersCollection.findOne(query);
            res.send({ isAdmin: user?.role == 'Admin' })
        });
        app.put('/users/admin/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: { status: 'verify' }
            }
            const result = await usersCollection.updateOne(query, updateDoc, options);
            res.send(result)
        });

        app.get('/user', async (req, res) => {
            let query = {}
            if (req.query.email) {
                query = { email: req.query.email }
            }
            const result = await usersCollection.findOne(query)
            res.send(result)
        });
        app.delete('/dashboard/users/:id', verifyJWT,verifyAdmin,  async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await usersCollection.deleteOne(query);
            console.log(result)
            res.send(result)
        });
        // user
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result)
        });
        app.delete('/users/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await usersCollection.deleteOne(query);
            res.send(result)
        });
        // app.put('/users/:id', verifyJWT,verifyAdmin, async (req, res) => {
        //     const id = req.params.id;
        //     const query = { _id: ObjectId(id) };
        //     const options = { upsert: true };
        //     const updateDoc = {
        //         $set: { status: 'verify' }
        //     }
        //     const result = await usersCollection.updateOne(query, updateDoc, options);
        //     res.send(result)
        // });
        // product

        app.post('/products',verifyJWT, verifySeller,async (req, res) => {
            const products = req.body;
            const result = await productsCollection.insertOne(products);
            res.send(result)
        });
        app.get('/products', async (req, res) => {
            let query = {};
            if (req.query.id) {
                query = { categoryId: req.query?.id }
            }
            if (req.query.email) {
                query = { email: req.query.email }
            }
            const result = await productsCollection.find(query).toArray()
            res.send(result)
        });
        app.delete('/products/:id',async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await productsCollection.deleteOne(query);
            res.send(result)
        });
        app.put('/product/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: { status: 'verify' }
            }
            const result = await productsCollection.updateOne(query, updateDoc, options);
            res.send(result)
        })
        // adsCollection
        app.get('/adsProducts',async (req, res) => {
            const query={}
            const result = await adsCollection.find(query).toArray();
            res.send(result)
        });

        app.delete('/adsProducts', async (req, res) => {
            const id = req.query.id;
            const query = { uniqId: id,paid:true }
            const result = await adsCollection.deleteOne(query);
            res.send(result)
        });
        app.post('/adsProducts', async (req, res) => {
            const data = req.body;
            const query = {
                uniqId: data.uniqId 
            }
            const alreadyBooked = await adsCollection.find(query).toArray();
            if (alreadyBooked.length) {
                const message = `Your Advertisement Already Set `
                return res.send({ acknowledged: false, message })
            }
            const result = await adsCollection.insertOne(data);
            res.send(result)
        });
        app.post('/bookedProduct', verifyJWT, async (req, res) => {
            const data = req.body;
            query = {
                productId: data.productId,
                userEmail:data.userEmail,
            }
            const alreadyBooked = await bookingCollection.find(query).toArray();
            if (alreadyBooked.length) {
                const message = 'Your Booked This Product'
                return res.send({ acknowledged: false, message })
            }
            const result = await bookingCollection.insertOne(data);
            res.send(result)
        });
        app.get('/bookedProduct', async (req, res) => {
            const email = req.query.userEmail
            const query = { userEmail: email }
            const result = await bookingCollection.find(query).toArray()
            res.send(result)
        });

        app.get('/bookedProduct/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await bookingCollection.findOne(query);
            res.send(result)
        })


        app.delete('/bookedProduct', verifyJWT, async (req, res) => {
            const id = req.query.id
            const query = { _id: ObjectId(id) }
            const result = await bookingCollection.deleteOne(query)
            res.send(result)
        });

        // payment intent 
        app.post('/payments', async (req, res) => {
            const payment = req.body;
            const result = await paymentsCollection.insertOne(payment);
            const id = payment.paymentId;
            const options={upsert:true}
            const addQ={uniqId:payment.productId}
            const allProduct={_id:ObjectId(payment.productId)}
            const query = { _id: ObjectId(id)}
            const updateDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId,
                }
            }
            const adsData=await adsCollection.updateOne(addQ, updateDoc,options)
            const allProductData=await productsCollection.updateOne(allProduct,updateDoc,options)
            const updateResult = await bookingCollection.updateOne(query, updateDoc,options)
            res.send(result,adsData,updateResult,allProductData);
            // res.send()
            // res.send();
            // res.send()
            
        })

        app.post('/create-payment-intent', async (req, res) => {
            const data = req.body;
            const price = data.sell;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                currency: 'usd',
                amount: amount,
                "payment_method_types": [
                    "card"
                ]
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        });

        //  Reported Item  / 
        app.post('/reportItem', verifyJWT, async (req, res) => {
            const data = req.body;
            query = {
                productId: data.productId,
                reporteremail:data.reporteremail
            }
            const alreadyBooked = await reportCollection.find(query).toArray();
            if (alreadyBooked.length) {
                const message = 'Your Already Reported This Product'
                return res.send({ acknowledged: false, message })
            }
            const result = await reportCollection.insertOne(data);
            res.send(result)
        });
        app.get('/reportItem', async (req, res) => {
            const email = req.query.userEmail
            const query = { userEmail: email }
            const result = await reportCollection.find(query).toArray()
            res.send(result)
        });
        app.delete('/reportItem', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.query.id
            const query = { _id: ObjectId(id) }
            const result = await reportCollection.deleteOne(query)
            res.send(result)
        });

        //   Reported item finished/ 

        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await usersCollection.findOne(query);
            res.send({ isAdmin: user?.role == 'Admin' })
        });
        app.get('/users/seller/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await usersCollection.findOne(query);
            res.send({ seller: user?.userType == 'Seller' })
        });

        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '2h' })
                return res.send({ accessToken: token })
            }
            res.status(403).send({ accessToken: '' })
        });
    }
    finally {

    }
}
run().catch(error => console.log(error))

app.get('/', (req, res) => {
    res.send('Mobile Bazar is running')
})

app.listen(port, () => console.log(`Mobile Bazar  :${port}`))