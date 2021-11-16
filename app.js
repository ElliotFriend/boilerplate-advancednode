'use strict';
require('dotenv').config();
const express = require('express');
const myDB = require('./connection');
const fccTesting = require('./freeCodeCamp/fcctesting.js');

// session and passport declarations
const session = require('express-session')
const passport = require('passport')
const LocalStrategy = require('passport-local')

// create the ObjectID query
const ObjectID = require('mongodb').ObjectID

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

// middleware to ensure a user is logged in
const ensureAuthenticated = (req, res, next) => {
  return req.isAuthenticated() ? next() : res.redirect('/')
}

myDB(async client => {
  const myDataBase = await client.db('passportChat').collection('users')

  app.route('/').get((req, res) => {
    res.render(`${process.cwd()}/views/pug`, {
      title: 'Connected to Database',
      message: 'Please login',
      showLogin: true
    });
  });

  // set up the passport-local strategy
  passport.use(new LocalStrategy((username, password, done) => {
    myDataBase.findOne({ username: username }, (err, user) => {
      console.log(`User ${username} attempted to log in.`)
      return err ? done(err) :
        !user ? done(null, false) :
        password !== user.password ? done(null, false) :
        done(null, user)
    })
  }))

  app.route('/login').post(
    passport.authenticate('local', { failureRedirect: '/' }),
    (req, res) => {
      res.redirect('/profile')
    }
  )

  app.route('/profile').get(
    ensureAuthenticated, (req, res) => {
      res.render(`${process.cwd()}/views/pug/profile`, {
        username: req.user.username
      })
    }
  )

  // Create (de)serializeUser functions
  passport.serializeUser((user, done) => {
    done(null, user._id)
  })

  passport.deserializeUser((id, done) => {
    myDB.findOne({ _id: new ObjectID(id) }, (err, doc) => {
      done(null, doc)
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
app.listen(PORT, () => {
  console.log('Listening on port ' + PORT);
});
