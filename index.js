const app = require('express')();
const path = require('path');
const fs = require('fs');
const openapi = require('express-openapi');
const cors = require('cors');
const Git = require("nodegit");
const GitHelper = require("./githelper.js");

// Load configuration, secrets
const config_port = process.env.PORT ? process.env.PORT : 9999;
const config_asset_path = process.env.ASSET_PATH ? process.env.ASSET_PATH : 
    "/home/oku/repos/chibi-scheme";

// Globals
var the_repo = null;

// Common result handlers
function unknown_service(req, res){
    res.status(404).json({err: "Unknown service"});
}

function history_bundle(req, res, array){
    function conv(e){
        const first = e.shift();
        const rest = e.map(x => x.sha());
        const ret = {
            "ident": first.sha(),
            "author": first.author().toString(),
            "date": first.date(),
            "message": first.message(),
            "rest_parents": rest
        };
        return ret;
    }
    res.json({result: array.map(conv)});
}


// Path handlers

const mainhistory = {
    get: function(req, res){
        const count = req.query.count;
        const from = req.query.from;
        if(the_repo != null){
            console.log("mainhistory",count,from);
            the_repo.getCommit(from).then(commit => {
                return GitHelper.getmainhistory(commit, count);
            }).then(array => {
                history_bundle(req, res, array);
            });
        }else{
            // FIXME: Perhaps 500 or so??
            unknown_service(req, res);
        }
    }
};

const heads = {
    get: function(req, res){
        if(the_repo != null){
            the_repo.getReferences(Git.Reference.TYPE.LISTALL).then(arr => {
                res.json({result: arr.map(e => {
                    return {name: e.name(), ref: e.target().tostrS()};})});
            });
        }else{
            // FIXME: Perhaps 500 or so??
            unknown_service(req, res);
        }
    }
};

// Configure server

const cors_options = {
    origin: "*", // FIXME: Arrange this
    methods: "GET"
};

app.use(cors(cors_options));

const openapi_args = {
    apiDoc: fs.readFileSync(path.resolve(__dirname, "api.json"), "utf8"),
    app: app,
    paths: [
        { 
            path: "/heads",
            module: heads  
        },
        {
            path: "/mainhistory",
            module: mainhistory 
        }

    ]
};

openapi.initialize(openapi_args);

app.disable("etag"); // As an API server, it's waste of time
console.log("Listening at", config_port);
app.listen(config_port);

console.log("Starting...", config_asset_path);

Git.Repository.open(config_asset_path).then(repo => {
    the_repo = repo;
    console.log("opened.", the_repo);
});

