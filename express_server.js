const express = require('express');
const app = express();
const PORT = 8080;
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());

app.set("view engine", "ejs");

const urlDatabase = {
  b6UTxQ: { longURL: "https://www.tsn.ca", userID: "user3" },
  i3BoGr: { longURL: "https://www.google.ca", userID: "user3" }
};

const users = {
  "userRandomID": {
    id: "userRandomID",
    email: "user@example.com",
    password: "purple-monkey-dinosaur"
  },
  "user2RandomID": {
    id: "user2RandomID",
    email: "user2@example.com",
    password: "dishwasher-funk"
  },
  "user3": {
    id: "user3",
    email: "edison.cy.yang@gmail.com",
    password: "123"
  },
  "user4": {
    id: "user4",
    email: "edison.c.yang@gmail.com",
    password: "123"
  }
};


///////HELPER FUNCTIONS/////////
//Generate a random alphanumeric string of length 6
const generateRandomString = function() {
  let result = "";
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const characterLength = characters.length;
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characterLength));
  }
  return result;
};

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
      if (users[user].password !== password) {
        return false;
      }
    }
  }
  return true;
};

const getUserIdWithEmail = function(email) {
  for (let user in users) {
    if (users[user].email === email) {
      return users[user].id;
    }
  }
  return null;
};

//Return the URLs where the userID is equal to the logged in user
const urlsForUser = function(id) {
  let result = {};
  for (let url in urlDatabase) {
    if (urlDatabase[url].userID === id) {
      result[url] = urlDatabase[url];
    }
  }
  return result;
};

///////////////////////////////////

app.get('/', (req, res) => {
  res.send("Hello!");
});

app.get('/urls.json', (req, res) => {
  res.send(urlDatabase);
});

app.get("/urls", (req, res) => {
  if (!req.cookies["user_id"]) {
    res.redirect("/login");
  } else {
    const loggedInUserID = req.cookies["user_id"];
    let urls = urlsForUser(loggedInUserID);
    
    let templateVars = { urls: urls, user: users[req.cookies["user_id"]]};
    res.render("urls_index", templateVars);
  }
});

app.get("/urls/new", (req, res) => {
  //If someone is not logged in when trying to access /urls/new, redirect them to the login page.
  if (!req.cookies["user_id"]) {
    res.redirect("/login");
  }
  let templateVars = { user: users[req.cookies["user_id"]]};
  res.render("urls_new", templateVars);
});

//Creates a new URL object and save to urlDatabase
app.post("/urls", (req, res) => {
  console.log(req.body);
  const shortURL = generateRandomString();
  const urlObject = {
    longURL: req.body.longURL,
    userID: req.cookies["user_id"]
  };
  urlDatabase[shortURL] = urlObject;
  res.redirect(`http://localhost:8080/urls/${shortURL}`);
});

app.post("/urls/:shortURL/delete", (req, res) => {
  console.log("cookie user id: ", req.cookies["user_id"]);
  if (req.cookies["user_id"] && urlDatabase[req.params.shortURL].userID === req.cookies["user_id"]) {
    console.log("cookie user id: ", req.cookies["user_id"]);
    delete urlDatabase[req.params.shortURL];
    res.redirect('http://localhost:8080/urls');
  }
});

//Only the owner of the URL can edit the link
app.post("/urls/:shortURL", (req, res) => {
  if (req.cookies["user_id"] && urlDatabase[req.params.shortURL].userID === req.cookies["user_id"]) {
    urlDatabase[req.params.shortURL].longURL = req.body.longURL;
    res.redirect('http://localhost:8080/urls');
  }
});

app.get("/urls/:shortURL", (req, res) => {
  //If user is not logged in and tried to access a URL page, prompts them to login
  if (!req.cookies["user_id"]) {
    res.redirect("/login");
  }
  //if the the URL with the matching :id does not belong to them.
  if (urlDatabase[req.params.shortURL].userID !== req.cookies["user_id"]) {
    res.send("You do not have access to this URL");
  }
  let templateVars = { shortURL: req.params.shortURL, longURL: urlDatabase[req.params.shortURL].longURL, user: users[req.cookies["user_id"]]};
  res.render("urls_show", templateVars);
});

app.get("/u/:shortURL", (req, res) => {
  const longURL = urlDatabase[req.params.shortURL].longURL;
  res.redirect(longURL);
});

app.get("/login", (req, res) => {
  let templateVars = { user: users[req.cookies["user_id"]] };
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
    const userID = getUserIdWithEmail(email);
    res.cookie("user_id", userID);
    res.redirect("/urls");
  }
});

app.post("/logout", (req, res) => {
  res.clearCookie("user_id");
  res.redirect("/urls");
});

app.get("/register", (req, res) => {
  let templateVars = { user: users[req.cookies["user_id"]] };
  res.render("user_registration", templateVars);
});

//Register a new user, if the email does not already exist
app.post("/register", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  if (!email || !password) {
    res.status(400).send("Empty email or password");
  }
  if (checkEmailExists(email)) {
    res.status(400).send("Email already exist!");
  }
  const id = generateRandomString();
  const newUser = {
    id,
    email,
    password
  };
  users[id] = newUser;
  res.cookie("user_id", id);
  console.log(users);
  res.redirect("/urls");
});

app.listen(PORT, () => {
  console.log(`App listening on ${PORT}`);
});

