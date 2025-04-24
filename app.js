const express = require('express');
const connectDB = require('./config/db');

const app = express();
const PORT = 2005;

// Connect to MongoDB
connectDB();

// Middleware to parse JSON
app.use(express.json());

// Example route
app.get('/', (req, res) => {
    res.send('Hello, Express + MongoDB!');
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
