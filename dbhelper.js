const MongoClient = require("mongodb").MongoClient;

function resetdb0(url, name){
    const client = new MongoClient(url,{useNewUrlParser:true});
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

function resetdb(url, name){
    const refsname = name + "_refs";
    const headsname = name + "_heads";
    const statename = name + "_state";
    const pathsname = name + "_paths";
    const client = new MongoClient(url,{useNewUrlParser:true});

    return Promise.all([
        resetdb0(url, refsname),
        resetdb0(url, statename),
        resetdb0(url, headsname),
        resetdb0(url, pathsname),
    ]).then(x => {
        return client.connect().then(client => {
            const refscol = client.db().collection(refsname);
            const headscol = client.db().collection(headsname);
            const pathscol = client.db().collection(pathsname);

            return refscol.createIndex({ident: 1}, {unique: true}).then(_ => refscol.createIndex({ "author": "text", "message":"text"})
            ).then(_ => 
                   headscol.insertOne({"theHead":"theHead","theHeads":[]})
            ).then(_ =>
                   pathscol.createIndex({"ident": 1, 
                                        "ops": "text",
                                        "page": 1})
            );
        });
    });
}

function make_db_setter(url, reposname, name){
    const colname = reposname + "_" + name;
    const client = new MongoClient(url,{useNewUrlParser:true});

    return new Promise((done, err) => {
        client.connect().then(client => {
            const col = client.db().collection(colname);
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

function make_db_getter(url, name){
    const refsname = name + "_refs";
    const client = new MongoClient(url,{useNewUrlParser:true});
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

function heads_set(url, name, obj){
    const headsname = name + "_heads";
    const client = new MongoClient(url,{useNewUrlParser:true});
    return client.connect().then(client => {
        return client.db().collection(headsname)
            .findOneAndReplace({theHead:"theHead"},
                               {theHead:"theHead", theHeads:obj});
    });
}

function heads_get(url, name){
    const headsname = name + "_heads";
    const client = new MongoClient(url,{useNewUrlParser:true});
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
