var DB = require("./dbhelper.js");

DB.resetdb("check").then(C => {
    console.log("done", C);
}).catch(x => {
    console.log("caught something", x);
});
