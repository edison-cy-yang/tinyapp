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
  b6UTxQ: { longURL: "https://www.tsn.ca", userID: "user3", visits: 0, uniqueVisitors: {}, visitHistory: [] },
  i3BoGr: { longURL: "https://www.google.ca", userID: "user3", visits: 0, uniqueVisitors: {}, visitHistory: [] }
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
    res.status(401).send("you cannot creat new short URLs if you're not logged in");
  } else {
    const shortURL = generateRandomString();
    const urlObject = {
      longURL: req.body.longURL,
      userID: req.session["user_id"],
      visits: 0,
      uniqueVisitors: {},
      visitHistory: []
    };
    urlDatabase[shortURL] = urlObject;
    res.redirect(`http://localhost:8080/urls/${shortURL}`);
  }
});

app.post("/urls/:shortURL/delete", (req, res) => {
  if (!req.session["user_id"]) {
    res.status(401).send("You are not logged in");
  }
  if (req.session["user_id"] && urlDatabase[req.params.shortURL].userID === req.session["user_id"]) {
    delete urlDatabase[req.params.shortURL];
    res.redirect('http://localhost:8080/urls');
  }
});

//Only the owner of the URL can edit the link
app.post("/urls/:shortURL", (req, res) => {
  if (!req.session["user_id"]) {
    res.status(401).send("You are not logged in");
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
    let templateVars = { error: "The requeusted URL does not exist", user: users[req.session["user_id"]] };
    res.render("error", templateVars);
  }
  //if the the URL with the matching :id does not belong to them.
  if (urlDatabase[req.params.shortURL].userID !== req.session["user_id"]) {
    let templateVars = { error: "You do not have access to this URL", user: users[req.session["user_id"]] };
    res.status(403).render("error", templateVars);
  }
  const shortURL = req.params.shortURL;
  const longURL = urlDatabase[shortURL].longURL;
  const visits = urlDatabase[shortURL].visits;
  const uniqueVisitors = Object.keys(urlDatabase[shortURL].uniqueVisitors).length;
  const visitHistory = urlDatabase[shortURL].visitHistory;
  let templateVars = { shortURL, longURL, visits, uniqueVisitors, visitHistory, user: users[req.session["user_id"]]};
  res.render("urls_show", templateVars);
});

app.get("/u/:shortURL", (req, res) => {
  if (!urlDatabase[req.params.shortURL]) {
    let templateVars = { error: "Cannot find the short URL", user: users[req.session["user_id"]] };
    res.status(404).render("error", templateVars);
  }
  //Use generate random string to generate a visitor id, store in cookie
  const visitorID = generateRandomString();
  const shortURL = req.params.shortURL;

  // if there doesn't exist a visitor id in the cookie, that means this user hasnt never visited the URL yet
  if (!req.session["visitor_id"]) {
    req.session["visitor_id"] = visitorID;
  }
  // if the url database doesn't have this visitor as a unique visitor yet, create it 
  if (!urlDatabase[shortURL].uniqueVisitors[req.session["visitor_id"]]) {
    urlDatabase[shortURL].uniqueVisitors[req.session["visitor_id"]] = true;
  }

  // add to visit history
  const date = new Date(Date.now());
  const dateString = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " + date.getHours() + ":" + date.getMinutes();
  const currentVisit = { timestamp: date, visitorID: req.session["visitor_id"]};
  urlDatabase[shortURL].visitHistory.push(currentVisit);
  // Increment the number of visits for this URL
  urlDatabase[shortURL].visits++;

  const longURL = urlDatabase[shortURL].longURL;
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
    let templateVars = { error: "Email does not exist!", user: users[req.session["user_id"]] };
    res.status(401).render("error", templateVars);
  } else if (!checkPasswordMatch(email, password)) { //if a user with that e-mail address is located, compare the password given in the form with the existing user's password. If it does not match, return a response with a 403 status code.
    let templateVars = { error: "Password incorrect!!!!!", user: users[req.session["user_id"]] };
    res.status(401).render("error", templateVars);
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
    let templateVars = { error: "Empty email or password", user: users[req.session["user_id"]] };
    res.status(400).render("error", templateVars);
  }
  if (checkEmailExists(req.body.email)) {
    let templateVars = { error: "Email already exists!", user: users[req.session["user_id"]] };
    res.status(400).render("error", templateVars);
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

