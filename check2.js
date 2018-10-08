const Git = require("nodegit");
const GitHelper = require("./githelper.js");

Git.Repository.open("/home/oku/repos/chibi-scheme").then(repo => {
    return repo.getCommit("78c757af4b4ec93083ee06a262138b6c822b4906");
}).then(commit => {
    return GitHelper.calcmainhistorychain(commit, R => Promise.resolve(true));
}).then(array => {
    var x = array.map(e => GitHelper.getcommitops(e));
    return Promise.all(x);
}).then(a => {
    console.log(a);
});
