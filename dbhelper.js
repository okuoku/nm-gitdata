const MongoClient = require("mongodb").MongoClient;

const url = "mongodb://127.0.0.1:27999/reposoup";
const client = new MongoClient(url);

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
    const statename = name + "_state";

    return Promise.all([resetdb0(refsname),resetdb0(statename)]).then(x => {
        return client.connect().then(client => {
            return client.db().collection(refsname).createIndex({ident: 1}, {unique: true}).then(x => {
                return client.db().collection(refsname).createIndex({ "author": "text", "message":"text"});
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

module.exports = {
    resetdb:resetdb,
    make_db_setter:make_db_setter,
    make_db_getter:make_db_getter
};
