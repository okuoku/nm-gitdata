const Git = require("nodegit");
const GitHelper = require("./githelper.js");
const DB = require("./dbhelper.js");

var G, S;

function procref(ref){
    if(ref.ident){
        console.log("check",ref.ident);
        return G(ref.ident).then(x => {
            if(x){
                console.log("skip",x.ident);
                return Promise.resolve(false);
            }else{
                console.log("insert",ref.ident);
                return S(ref);
            }
        });
    }else{
        console.log("Fatal: invalid ref", ref);
        process.exit(-1);
    }
}

DB.make_db_getter("check").then(theGetter => {
    G = theGetter;
    return Promise.resolve(true);
}).then(_ => {
    return DB.make_db_setter("check")
}).then(theSetter => {
    S = theSetter;
    return Promise.resolve(true);
}).then(_ => {
    return Git.Repository.open("/home/oku/repos/chibi-scheme");
}).then(repo => {
    return repo.getCommit("78c757af4b4ec93083ee06a262138b6c822b4906");
}).then(commit => {
    return GitHelper.calcmainhistorychain(commit, R => Promise.resolve(true));
}).then(array => {
    var x = array.map(e => GitHelper.getcommitops(e));
    return Promise.all(x);
}).then(a => {
    return Promise.all(a.map(procref));
}).then(a => {
    console.log(a);
    console.log("Done.");
});
