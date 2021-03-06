const Git = require("nodegit");
const GitHelper = require("./githelper.js");
const DB = require("./dbhelper.js");

// Load configuration, secrets
const config_asset_path = process.env.ASSET_PATH ? process.env.ASSET_PATH :
    "c:/cygwin64/home/oku/repos/yunibase/impl-current/mit-scheme";
const config_mongo_url = process.env.MONGO_URL ? process.env.MONGO_URL :
    "mongodb://127.0.0.1:27999/reposoup";

var G, S, P, REPO;

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
            const pagesize = 300;
            let oppages_count = 0;
            let oppages = [];
            GitHelper.getcommitops(commit).then(ops => {
                oppages_count = Math.ceil(ops.length / pagesize);
                for(let page = 0; page != oppages_count; page++){
                    let end = Math.min((page+1) * pagesize, ops.length);
                    let content = [];
                    for(let idx = page; idx != end; idx++){
                        content.push(ops[idx]);
                    }
                    oppages.push({"ident":commit.sha(),
                                 "page":page,
                                 "ops":content});
                }
                if(ops.length == 0){
                    return Promise.resolve([]);
                }else{
                    return Promise.all(oppages.map(e => P(e)));
                }
            }).then(_ => {
                commit.getParents().then(parents => {
                    setcount();
                    return S({
                             "ident":commit.sha(),
                             "author":commit.author().toString(),
                             "date":commit.date(),
                             "message":commit.message(),
                             "parents":parents.map(c => c.sha())
                    });
                }).then(_ => res(true));
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

DB.make_db_getter(config_mongo_url, "check").then(theGetter => {
    G = theGetter;
    return Promise.resolve(true);
}).then(_ => {
    return DB.make_db_setter(config_mongo_url, "check", "refs");
}).then(theSetter => {
    S = theSetter;
    return DB.make_db_setter(config_mongo_url, "check", "paths");
}).then(theSetter => {
    P = theSetter;
    return Promise.resolve(true);
}).then(_ => {
    return Git.Repository.open(config_asset_path);
}).then(repo => {
    REPO = repo;
    return repo.getReferences(Git.Reference.TYPE.LISTALL);
}).then(arr => {
    return DB.heads_set(config_mongo_url, "check",arr.map(headsmap)).then(_ => {
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

