// jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth2').Strategy;
const ejs = require("ejs");
const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  secret: "cookie_secret",
  resave: true,
  saveUninitialized: true
}));

mongoose.connect('mongodb+srv://anandp9226:pass123@cluster0.q5hix7s.mongodb.net/?retryWrites=true&w=majority/secret', { useNewUrlParser: true, useUnifiedTopology: true });







const collectionSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String
});

const secretSchema=new mongoose.Schema({
  data: String
});

const collection1=mongoose.model("Secrets",secretSchema);

collectionSchema.plugin(passportLocalMongoose);

const collection = mongoose.model("register", collectionSchema);

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(async function(user, done) {
  try {
    done(null, user.id);
  } catch (err) {
    console.error("Error while serializing user:", err);
    done(err);
  }
});

passport.deserializeUser(async function(id, done) {
  try {
    const user = await collection.findById(id);
    done(null, user);
  } catch (err) {
    console.error("Error while deserializing user:", err);
    done(err);
  }
});

passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/project",
  passReqToCallback: true,
  userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
},
  async function (request, accessToken, refreshToken, profile, done) {
    try {
      const user = await collection.findOne({ googleId: profile.id });

      if (!user) {
        const newUser = new collection({
          googleId: profile.id
          // Add any other relevant user properties here
        });
        const savedUser = await newUser.save();
        return done(null, savedUser);
      } else {
        return done(null, user);
      }
    } catch (err) {
      console.error("Error:", err);
      return done(err);
    }
  }
));

app.get("/", async function (req, res) {
  try {
    await res.render("home");
  } catch (err) {
    console.log("Error occurring during get request");
  }
});

app.get("/auth/google",
  passport.authenticate("google", { scope: ['profile'] }),
  function (req, res) {
    console.log(profile);
    res.redirect('/secret');
  }
);

app.get("/auth/google/project",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function (req, res) {
    res.redirect('/secret');
  }
);

app.get("/login", async function (req, res) {
  try {
    res.render("login");
  } catch (err) {
    console.log("Cannot get login page " + err);
  }
});

app.get("/register", async function (req, res) {
  try {
    res.render("register");
  } catch (err) {
    console.log("Cannot get register page " + err);
  }
});

app.post("/login", async function (req, res) {
  const user = new collection({
    username: req.body.username,
    password: req.body.password
  });
  await users.save();
  req.login(user, function (err) {
    if (err) {
      console.log("Cannot log in" + err);
    } else {
      res.render("secrets");
    }
  });
});

app.get("/secret", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("secrets");
  } else {
    res.redirect("/login");
  }
});

app.get("/submit", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});

app.post("/submit", async function (req, res) {
  try {
    const submittedSecret = req.body.secret;
    const sec=await new collection1({
      data:submittedSecret
    });
    await sec.save();
    const foundUser = await collection.findById(req.user.id);
    if (foundUser) {
      foundUser.secret = submittedSecret;
      await foundUser.save();
      res.redirect("/secret");
    }
  } catch (err) {
    console.error(err);
  }
});

app.post("/register", async function (req, res) {
  await collection.register({ username: req.body.username }, req.body.password, function (err, user) {
    if (err) {
      console.log("Error occurred during creating the user: " + err);
      res.redirect("/");
    } else {
      passport.authenticate("local")(req, res, function () {
        console.log("authenticated successfully");
        res.redirect("/secret");
      });
    }
  });
});

app.get("/logout", function (req, res) {
  req.logout(function (err) {
    if (err) {
      console.log("Cannot logout");
    } else {
      res.redirect("/login");
    }
  });
});

app.listen(3000, function () {
  console.log("Server is running on port 3000");
});
