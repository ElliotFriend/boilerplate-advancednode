const passport = require('passport')
const LocalStrategy = require('passport-local')
const bcrypt = require('bcrypt')
const ObjectID = require('mongodb').ObjectID

module.exports = function (app, myDataBase) {

  // set up the passport-local strategy
  passport.use(new LocalStrategy((username, password, done) => {
    myDataBase.findOne({ username: username }, (err, user) => {
      console.log(`User ${username} attempted to log in.`)
      return err ? done(err) :
        !user ? done(null, false) :
        !bcrypt.compareSync(password, user.password) ? done(null, false) :
        done(null, user)
    })
  }))

  // Create (de)serializeUser functions
  passport.serializeUser((user, done) => {
    done(null, user._id)
  })

  passport.deserializeUser((id, done) => {
    myDataBase.findOne({ _id: new ObjectID(id) }, (err, doc) => {
      done(null, doc)
    })
  })
}
