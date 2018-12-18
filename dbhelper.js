const MongoClient = require("mongodb").MongoClient;

const url = "mongodb://127.0.0.1:27999/reposoup";
const client = new MongoClient(url,{useNewUrlParser:true});

function resetdb0(name){
    return new Promise((done,err) => {
        client.connect().then(client => {
            client.db().dropCollection(name).then(C => {
                client.close();
                done(true);
            }).catch(x => {
                console.log("error",x); 
                client.close();
                done(x);
            });
        });
    });
}

function resetdb(name){
    const refsname = name + "_refs";
    const headsname = name + "_heads";
    const statename = name + "_state";

    return Promise.all([resetdb0(refsname),resetdb0(statename),resetdb0(headsname)]).then(x => {
        return client.connect().then(client => {
            return client.db().collection(refsname).createIndex({ident: 1}, {unique: true}).then(x => {
                return client.db().collection(refsname).createIndex({ "author": "text", "message":"text"});
            }).then(_ => {
                return client.db().collection(headsname).insertOne({"theHead":"theHead","theHeads":[]});
            });
        });
    });
}

function make_db_setter(name){
    const refsname = name + "_refs";

    return new Promise((done, err) => {
        client.connect().then(client => {
            const col = client.db().collection(refsname);
            function setter(obj){
                if(obj){
                    return col.insertOne(obj);
                }else{
                    return client.close();
                }
            }
            done(setter);
        }).catch(e => err(e));
    });
}

function make_db_getter(name){
    const refsname = name + "_refs";
    return new Promise((done, err) => {
        client.connect().then(client => {
            const col = client.db().collection(refsname);
            function getter(ident){
                //console.log("Get", ident);
                if(ident){
                    return new Promise((done, err) => {
                        //console.log("Find", ident);
                        col.find({ident: ident}).toArray().then(arr => {
                            if(arr && arr.length == 1){
                                done(arr[0]);
                            }else{
                                if(arr.length != 0){
                                    console.log("Something wrong", arr);
                                    err(true);
                                }else{
                                    done(false);
                                }
                            }
                        });
                    });
                }else{
                    return client.close();
                }
            }
            done(getter);
        }).catch(e => err(e));
    });
}

function heads_set(name, obj){
    const headsname = name + "_heads";
    return client.connect().then(client => {
        return client.db().collection(headsname)
            .findOneAndReplace({theHead:"theHead"},
                               {theHead:"theHead", theHeads:obj});
    });
}

function heads_get(name){
    const headsname = name + "_heads";
    return new Promise((done, err) => {
        client.connect().then(client => {
            return client.db().collection(headsname);
        }).then(col => {
            col.find({theHead:"theHead"}).toArray().then(arr => {
                if(arr && arr.length == 1){
                    done(arr[0]);
                }else{
                    if(arr){
                        console.log("something wrong", arr);
                        err(true);
                    }else{
                        done(false);
                    }
                }
            });
        });
    });
}

module.exports = {
    resetdb:resetdb,
    make_db_setter:make_db_setter,
    make_db_getter:make_db_getter,
    heads_set:heads_set,
    heads_get:heads_get
};
