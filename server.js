const express = require('express');
const http = require('http');

const app = express();
app.use(express.json());

const server = http.createServer(app);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/', (req, res) => {
  res.send('Hello, trading platform!');
});

const port = 5000;
server.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on port ${port}`);
});