const http = require('http');
const app = require('./app');
const { connect, close } = require('./db/mongo');

const PORT = process.env.PORT || 4000;

const server = http.createServer(app);

async function start() {
  try {
    await connect();
    server.listen(PORT, () => {
      console.log(`CoupleCanvas backend running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server', err);
    process.exit(1);
  }
}

start();

process.on('SIGINT', async () => {
  console.log('Shutting down...');
  try { await close(); } catch (e) { /* ignore */ }
  server.close(() => process.exit(0));
});
