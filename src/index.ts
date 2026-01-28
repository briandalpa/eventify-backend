import express from 'express';
import dotenv from 'dotenv';

const app = express();

dotenv.config();

const PORT = process.env.PORT;

app.get('/api', (req, res) => {
  res.send('Hello World');
});

app.listen(PORT, () => {
  console.log(`Server running on PORT: ${PORT}`);
});
