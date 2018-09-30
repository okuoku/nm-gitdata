function getmainhistory(commit, count){
    var cur = commit;
    var ret = [];

    ret.push([cur]);

    return new Promise(done => {
        function next(){
            if(count == 0){
                done(ret);
            }else{
                cur.getParents().then(arr => {
                    if(arr && arr[0]){
                        ret.push(arr);
                        count--;
                        cur = arr[0];
                        next();
                    }else{
                        done(ret);
                    }
                });
            }
        };

        next();
    });
};

module.exports = {
    getmainhistory:getmainhistory
};
