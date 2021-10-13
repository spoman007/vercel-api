import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import product from './api/news';

const app = express();

app.use(cors());

const port = process.env.PORT || 3000;

app.use(express.json({ extended: false }));

app.use('/api', product);

app.listen(port, () => console.log(`Listening on port ${port}`));
