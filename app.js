//jshint esversion:6
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const app = express();

const User = require('./models/user');
const Complain = require('./models/complain');

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));


// Configure session middleware
app.use(session({
  secret: "aman",
  resave: false,
  saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());


// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/myproject', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('Connected to MongoDB');
})
.catch((error) => {
  console.log('Error connecting to MongoDB:', error);
});

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  console.log("Deserializing user:", id);
  User.findOne({ _id: id })
    .then(user => {
      done(null, user); // Pass the user to the 'done' callback
    })
    .catch(error => {
      done(error); // Pass any errors to the 'done' callback
    });
});

// Routes

app.get("/",function(req,res){
  console.log('Accessing home page');
  res.render("home");
});


app.get("/signup",function(req,res)
{
    res.render("signup"); 
});

app.get("/login",function(req,res)
{
    res.render("login");
});


app.get("/profile",function(req,res){
  console.log("Accessing profile page");
  console.log("Authenticated:", req.isAuthenticated());
  if (req.isAuthenticated()) {
    console.log(req.user.username);
    console.log(req.user.email);
    res.render('profile', { user: req.user });
  } else {
    res.redirect("/login");
  }
});




app.get("/history", function(req, res) {
  if (!req.isAuthenticated()) {
    return res.redirect("/login");
  }

  const username = req.user.email;

  Complain.find({ username, status: { $in: ["confirm"] } })
    .then(complains => {
      res.render("history", { complains });
    })
    .catch(err => {
      console.log(err);
      res.status(500).json({ message: 'No past complains', error: err.message });
    });
});





app.get("/current_comp", function(req, res) {
  if (!req.isAuthenticated()) {
    return res.redirect("/login");
  }

  const username = req.user.email;

  Complain.find({ username, status: { $in: ["pending", "inProcess"] } })
    .then(complains => {
      res.render("current_comp", { complains });
    })
    .catch(err => {
      console.log(err);
      res.status(500).json({ message: 'No current complains', error: err.message });
    });
});

app.get("/complain",function(req,res){
  console.log("Authenticated:", req.isAuthenticated());
  if (req.isAuthenticated()) {
    res.render('complain', { user: req.user });
  } else {
    res.redirect("/login");
  }
});

app.post("/complain", function(req, res) {
  const { itemName, brandName, modelNo, description, underWarranty, timing } = req.body;

  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Authentication required to submit a complaint' });
  }

  const username = req.user.email;

  if (!username) {
    return res.status(400).json({ message: 'Username not found in user object' });
  }

  const newComplain = new Complain({
    username,
    itemName,
    brandName,
    modelNo,
    description,
    underWarranty,
    timing,
    status: 'pending'
  });

  newComplain.save()
    .then(savedComplain => {
      // res.render("current_comp");
      res.status(201).json({ message: 'Complaint submitted successfully', complain: savedComplain });
    })
    .catch(err => {
      console.log(err);
      res.status(500).json({ message: 'Failed to submit the complaint', error: err.message });
    });
});



app.post("/signup", function(req, res) {
  const newUser = new User({
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    mobileNumber: req.body.mobileNumber,
    address: req.body.address,
    email: req.body.email
  });

  User.register(newUser, req.body.password, function(err, user) {
    if (err) {
      console.log(err);
      res.status(400).json({ message: 'Registration failed!', error: err.message });
    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/");
      });
    }
  });
});


app.post("/login", function(req, res) {
    const user = new User({
    username: req.body.username,
    password: req.body.password
  });
  console.log("User object:", user);
  req.login(user, function(err) {
    if (err) {
      console.log(err);
      res.status(401).json({ message: 'Login failed!', error: err.message });
    } else {
      console.log("Authentication successful. Redirecting...");
      passport.authenticate("local")(req, res, function() {
        res.redirect("/");
      });
    }
  });
});



app.get('/logout', function(req, res) {
  // Clear the session and log the user out
  req.session.destroy(function(err) {
    if (err) {
      console.error('Error destroying session:', err);
    }
    // Redirect the user to a login page or any other appropriate page
    res.redirect('/');
  });
});


app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
