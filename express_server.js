const express = require('express');
const app = express();
const PORT = 8080;
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const cookieSession = require('cookie-session');

const { getUserWithEmail, generateRandomString, urlsForUser } = require('./helpers');

app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieSession({
  name: 'session',
  keys: ["edgserghdrth", "rerigerpogi", "something", "haha"]
}));

app.set("view engine", "ejs");

const urlDatabase = {
  b6UTxQ: { longURL: "https://www.tsn.ca", userID: "user3" },
  i3BoGr: { longURL: "https://www.google.ca", userID: "user3" }
};

const users = {
  "userRandomID": {
    id: "userRandomID",
    email: "user@example.com",
    password: bcrypt.hashSync("purple-monkey-dinosaur", 10)
  },
  "user2RandomID": {
    id: "user2RandomID",
    email: "user2@example.com",
    password: bcrypt.hashSync("dishwasher-funk", 10)
  },
  "user3": {
    id: "user3",
    email: "edison.cy.yang@gmail.com",
    password: bcrypt.hashSync("123",10)
  },
  "user4": {
    id: "user4",
    email: "edison.c.yang@gmail.com",
    password: bcrypt.hashSync("123", 10)
  }
};


///////HELPER FUNCTIONS/////////
const checkEmailExists = function(email) {
  for (let user in users) {
    if (users[user].email === email) {
      return true;
    }
  }
  return false;
};

const checkPasswordMatch = function(email, password) {
  for (let user in users) {
    if (users[user].email === email) {
      if (!bcrypt.compareSync(password, users[user].password)) {
        return false;
      }
    }
  }
  return true;
};

///////////////////////////////////

app.get('/', (req, res) => {
  if (!req.session["user_id"]) {
    res.redirect('/login');
  } else {
    res.redirect('/urls');
  }
});

app.get("/urls", (req, res) => {
  if (!req.session["user_id"]) {
    res.redirect("/login");
  } else {
    const loggedInUserID = req.session["user_id"];
    let urls = urlsForUser(loggedInUserID, urlDatabase);
    
    let templateVars = { urls: urls, user: users[req.session["user_id"]]};
    res.render("urls_index", templateVars);
  }
});

app.get("/urls/new", (req, res) => {
  //If someone is not logged in when trying to access /urls/new, redirect them to the login page.
  if (!req.session["user_id"]) {
    res.redirect("/login");
  }
  let templateVars = { user: users[req.session["user_id"]]};
  res.render("urls_new", templateVars);
});

//Creates a new URL object and save to urlDatabase
app.post("/urls", (req, res) => {
  if (!req.session["user_id"]) {
    res.send("you cannot creat new short URLs if you're not logged in");
  } else {
    const shortURL = generateRandomString();
    const urlObject = {
      longURL: req.body.longURL,
      userID: req.session["user_id"]
    };
    urlDatabase[shortURL] = urlObject;
    res.redirect(`http://localhost:8080/urls/${shortURL}`);
  }
});

app.post("/urls/:shortURL/delete", (req, res) => {
  if (!req.session["user_id"]) {
    res.send("You are not logged in");
  }
  if (req.session["user_id"] && urlDatabase[req.params.shortURL].userID === req.session["user_id"]) {
    delete urlDatabase[req.params.shortURL];
    res.redirect('http://localhost:8080/urls');
  }
});

//Only the owner of the URL can edit the link
app.post("/urls/:shortURL", (req, res) => {
  if (!req.session["user_id"]) {
    res.send("You are not logged in");
  }
  if (req.session["user_id"] && urlDatabase[req.params.shortURL].userID === req.session["user_id"]) {
    urlDatabase[req.params.shortURL].longURL = req.body.longURL;
    res.redirect('http://localhost:8080/urls');
  }
});

app.get("/urls/:shortURL", (req, res) => {
  //If user is not logged in and tried to access a URL page, prompts them to login
  if (!req.session["user_id"]) {
    res.redirect("/login");
  }
  //if the shortURL does not match any URL in the database
  if (!urlDatabase[req.params.shortURL]) {
    res.send("The requested URL does not exist!");
  }
  //if the the URL with the matching :id does not belong to them.
  if (urlDatabase[req.params.shortURL].userID !== req.session["user_id"]) {
    res.send("You do not have access to this URL");
  }
  let templateVars = { shortURL: req.params.shortURL, longURL: urlDatabase[req.params.shortURL].longURL, user: users[req.session["user_id"]]};
  res.render("urls_show", templateVars);
});

app.get("/u/:shortURL", (req, res) => {
  if (!urlDatabase[req.params.shortURL]) {
    res.send("Cannot find this short URL!");
  }
  const longURL = urlDatabase[req.params.shortURL].longURL;
  res.redirect(longURL);
});

app.get("/login", (req, res) => {
  if (req.session["user_id"]) {
    res.redirect('/urls');
  }
  let templateVars = { user: users[req.session["user_id"]] };
  res.render("user_login", templateVars);
});

//Log a user in. Return error if email not found or wrong password
app.post("/login", (req, res) => {
  //if a user with that email cannot be found, return error with 403 code
  const email = req.body.email;
  const password = req.body.password;
  if (!checkEmailExists(email)) {
    res.status(403).send("Cannot find email!");
  } else if (!checkPasswordMatch(email, password)) { //if a user with that e-mail address is located, compare the password given in the form with the existing user's password. If it does not match, return a response with a 403 status code.
    res.status(403).send("Password incorrect!!!!");
  } else {
    //If both checks pass, set the user_id cookie with the matching user's random ID, then redirect to /urls.
    const user = getUserWithEmail(email, users);
    req.session["user_id"] = user.id;
    res.redirect("/urls");
  }
});

app.post("/logout", (req, res) => {
  req.session["user_id"] = null;
  res.redirect("/urls");
});

app.get("/register", (req, res) => {
  if (req.session["user_id"]) {
    res.redirect('/urls');
  }
  let templateVars = { user: users[req.session["user_id"]] };
  res.render("user_registration", templateVars);
});

//Register a new user, if the email does not already exist
app.post("/register", (req, res) => {
  if (!req.body.email || !req.body.password) {
    res.status(400).send("Empty email or password");
  }
  if (checkEmailExists(req.body.email)) {
    res.status(400).send("Email already exist!");
  }
  const email = req.body.email;
  const password = bcrypt.hashSync(req.body.password, 10);
  
  const id = generateRandomString();
  const newUser = {
    id,
    email,
    password
  };
  users[id] = newUser;
  req.session["user_id"] = id;
  res.redirect("/urls");
});

app.listen(PORT, () => {
  console.log(`App listening on ${PORT}`);
});

