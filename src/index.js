const config = require('./config');
const mongooseconnect = require('./util/mongooseconnect');
const socketmanager = require('./socketmanager');

function handler(req, res) {
  res.writeHead(200);
  res.end('IQChat available !');
}

const app = require('http').createServer(handler);
const io = require('socket.io')(app);

mongooseconnect()
  .then(() => {
    console.log('Connected to MongoDB.');
  })
  .catch(err => {
    console.error(err);
  });

socketmanager(io);

app.listen(config.port, config.host);

app.on('listening', () => {
  console.log(`Listening on address ${app.address().address}:${app.address().port}`);
});