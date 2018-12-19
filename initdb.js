var DB = require("./dbhelper.js");

const config_mongo_url = process.env.MONGO_URL ? process.env.MONGO_URL :
    "mongodb://127.0.0.1:27999/reposoup";

DB.resetdb(config_mongo_url, "check").then(C => {
    console.log("done", C);
    process.exit(0);
}).catch(x => {
    console.log("caught something", x);
});
