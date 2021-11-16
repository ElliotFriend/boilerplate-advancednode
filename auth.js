const passport = require('passport')
const LocalStrategy = require('passport-local')
const GitHubStrategy = require('passport-github2').Strategy
const OldGithubStrategy = require('passport-github').Strategy
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

  let cbURL = process.env.NODE_ENV === 'development'
    ? 'http://localhost:8080'
    : 'https://boilerplate-advancednode.elliotfriend.repl.co'
  // set up the passport-github2 strategy
  passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: `${cbURL}/auth/github/callback`
  }, (accessToken, refreshToken, profile, done) => {
    console.log(profile)
    myDataBase.findOneAndUpdate(
      { id: profile.id },
      {
        $setOnInsert: {
          id: profile.id,
          name: profile.displayName || 'John Doe',
          photo: profile.photos[0].value || '',
          email: Array.isArray(profile.emails)
            ? profile.emails[0].value
            : 'No public email',
          created_on: new Date(),
          provider: profile.provider || ''
        },
        $set: {
          last_login: new Date()
        },
        $inc: {
          login_count: 1
        }
      },
      { upsert: true, new: true },
      (err, doc) => {
        return done(null, doc.value)
      }
    )
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
