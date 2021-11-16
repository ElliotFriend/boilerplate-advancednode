'use strict';
require('dotenv').config();
const express = require('express');
const myDB = require('./connection');
const routes = require('./routes')
const auth = require('./auth')
const fccTesting = require('./freeCodeCamp/fcctesting.js');

// session and passport declarations
const session = require('express-session')
const passport = require('passport')

const app = express();
app.set('view engine', 'pug');

fccTesting(app); //For FCC testing purposes
app.use('/public', express.static(process.cwd() + '/public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// initialize session and passport
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
  cookie: { secure: false }
}))

app.use(passport.initialize())
app.use(passport.session())

const http = require('http').createServer(app)
const io = require('socket.io')(http)

myDB(async client => {
  const myDataBase = await client.db('passportChat').collection('users')

  routes(app, myDataBase)
  auth(app, myDataBase)

  let currentUsers = 0
  io.on('connection', (socket) => {
    ++currentUsers
    io.emit('user count', currentUsers)
    console.log('A user has connected')

    socket.on('disconnect', () => {
      --currentUsers
      io.emit('user count', currentUsers)
      console.log('A user has disconnected')
    })
  })

}).catch(e => {
  app.route('/').get((req, res) => {
    res.render(`${process.cwd()}/views/pug`, {
      title: e,
      message: 'Unable to login'
    })
  })
})

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log('Listening on port ' + PORT);
});
