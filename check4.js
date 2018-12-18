const Git = require("nodegit");
const GitHelper = require("./githelper.js");
const DB = require("./dbhelper.js");

var G, S, REPO;

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

function procbranch(repo, ref){ // => Promise
    const myname = ref.name();
    var check_counter = 0;
    var set_counter = 0;
    function checkcount(){
        if((check_counter % 500) == 0){
            console.log("CHECK: ",myname,check_counter);
        }
        check_counter++;
    }

    function setcount(){
        if((set_counter % 500) == 0){
            console.log("SET: ",myname,set_counter);
        }
        set_counter++;
    }
    function check(commit){
        return new Promise(res => {
            G(commit.sha()).then(x => {
                if(x){
                    console.log("TERM", commit.sha());
                    res(false);
                }else{
                    checkcount();
                    //console.log("CONT", commit.sha());
                    res(true);
                }
            });
        });
    }
    function enterref(commit){
        return new Promise(res => {
            commit.getParents().then(parents => {
                setcount();
                return S({
                         "ident":commit.sha(),
                         "author":commit.author().toString(),
                         "date":commit.date(),
                         "message":commit.message(),
                         "parents":parents.map(c => c.sha())
                });
            }).then(_ => {
                res(true);
            });
        });
    }


    return new Promise(res => {
        console.log("Procbranch:",ref.name(), ref.target().tostrS());
        repo.getCommit(ref.target()).then(commit => {
            return GitHelper.calcmainhistorychain(commit, check);
        }).then(chain => {
            console.log("Enterref:",ref.name());
            return chain.reduce((cur, e) => {
                return cur.then(_ => {
                    return enterref(e).then(_ => {
                    });
                });
            }, Promise.resolve());
        }).then(_ => {
            console.log("Done:",ref.name(),check_counter,set_counter);
            res(true);
        }).catch(e => {
            console.warn("catch",e);
            res(false);
        });
    });
}

function headsmap(ref){
    return {
        name: ref.name(),
        ref: ref.target().tostrS()
    };
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
    return Git.Repository.open("c:/cygwin64/home/oku/repos/yunibase/impl-current/mit-scheme");
}).then(repo => {
    REPO = repo;
    return repo.getReferences(Git.Reference.TYPE.LISTALL);
}).then(arr => {
    return DB.heads_set("check",arr.map(headsmap)).then(_ => {
        return arr.reduce((cur, e) => {
            return cur.then(_ => {
                return procbranch(REPO, e).then(_ => {
                    console.log("PROC:",e.target().tostrS());
                });
            });
        }, Promise.resolve());
    });
}).then(_ => {
    console.log("Done.");
    process.exit(0);
});

