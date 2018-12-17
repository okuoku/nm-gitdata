var DB = require("./dbhelper.js");

DB.resetdb("check").then(C => {
    console.log("done", C);
    process.exit(0);
}).catch(x => {
    console.log("caught something", x);
});
