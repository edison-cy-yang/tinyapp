const express = require('express');
const app = express();
const PORT = 8080;
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());

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

app.set("view engine", "ejs");

const urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
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
  }
};

app.get('/', (req, res) => {
  res.send("Hello!");
});

app.get('/urls.json', (req, res) => {
  res.send(urlDatabase);
});

app.get("/urls", (req, res) => {
  let templateVars = { urls: urlDatabase, user: users[req.cookies["user_id"]]};
  res.render("urls_index", templateVars);
});

app.get("/urls/new", (req, res) => {
  let templateVars = { user: users[req.cookies["user_id"]]};
  res.render("urls_new", templateVars);
});

app.post("/urls", (req, res) => {
  console.log(req.body);
  const shortURL = generateRandomString();
  urlDatabase[shortURL] = req.body.longURL;
  res.redirect(`http://localhost:8080/urls/${shortURL}`);
});

app.post("/urls/:shortURL/delete", (req, res) => {
  delete urlDatabase[req.params.shortURL];
  res.redirect('http://localhost:8080/urls');
});

app.post("/urls/:shortURL", (req, res) => {
  urlDatabase[req.params.shortURL] = req.body.longURL;
  res.redirect('http://localhost:8080/urls');
})

app.get("/urls/:shortURL", (req, res) => {
  let templateVars = { shortURL: req.params.shortURL, longURL: urlDatabase[req.params.shortURL], user: users[req.cookies["user_id"]]};
  res.render("urls_show", templateVars);
});

app.get("/u/:shortURL", (req, res) => {
  const longURL = urlDatabase[req.params.shortURL];
  res.redirect(longURL);
});

app.get("/login", (req, res) => {
  let templateVars = { user: users[req.cookies["user_id"]] };
  res.render("user_login", templateVars);
})

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
  const new_user = {
    id,
    email,
    password
  };
  users[id] = new_user;
  res.cookie("user_id", id);
  console.log(users);
  res.redirect("/urls");
});

app.listen(PORT, () => {
  console.log(`App listening on ${PORT}`);
});

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
    if(users[user].email === email) {
      return users[user].id;
    }
  }
  return null;
}