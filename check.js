const Git = require("nodegit");
const GitHelper = require("./githelper.js");

Git.Repository.open("/home/oku/repos/yuni").then(repo => {
    return repo.getMasterCommit();
}).then(commit => {
    return GitHelper.getmainhistory(commit, 10);
}).then(top10 => {
    top10.forEach(e => { console.log(e[0].sha()); });
});
