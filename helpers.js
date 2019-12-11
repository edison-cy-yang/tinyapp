//Return the user id of the given email from user database
const getUserWithEmail = function(email, database) {
  for (let user in database) {
    if (database[user].email === email) {
      return database[user];
    }
  }
  return null;
};

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

//Return the URLs where the userID is equal to the logged in user
const urlsForUser = function(id, database) {
  let result = {};
  for (let url in database) {
    if (database[url].userID === id) {
      result[url] = database[url];
    }
  }
  return result;
};

module.exports = {
  getUserWithEmail,
  generateRandomString,
  urlsForUser
};