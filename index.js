var express = require('express');
var request = require('request');
var uuid = require('node-uuid');
var expressLayouts = require('express-ejs-layouts');
var bodyParser = require('body-parser')

var app = express();

app.use(express.static(__dirname + '/public'));
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(bodyParser());
app.use(expressLayouts);
app.set('layout','layout');
var port = 3000;
var name = "Spencer";
var url = 'localhost:3000';
if (process.argv[2]) {
    port = process.argv[2];
}
if (process.argv[3]) {
    name = process.argv[3];
}

app.listen(port, function(){

})

var id = uuid.v4();

var neighbors = [];
var rumors = [];
var wants = {};

var nextid = 0;

var recursive = function() {
    sendMsg();
    setTimeout(recursive, 100);
};

setTimeout(recursive, 100);

function getPeer(state){
    var rand = Math.floor(Math.random() * neighbors.length);
    return neighbors[rand];
}

function prepareRumor(peer) {
    if (rumors.length === 0) {
        return undefined;
    }
    var rand = Math.floor(Math.random() * (rumors.length));
    var rumor = rumors[rand];
    var peerwant = wants[peer.url];
    if (peerwant === undefined ) {
        if (rumor.Rumor.MessageID.split(':')[1] === '0') {
            return rumor;
        } else {
            return undefined;
        }

    } else {
        if (peerwant.Want[rumor.Rumor.MessageID.split(':')[0]] == undefined && rumor.Rumor.MessageID.split(':')[1] === '0') {
            return rumor;
        } else if (parseInt(peerwant.Want[rumor.Rumor.MessageID.split(':')[0]]) >= parseInt(rumor.Rumor.MessageID.split(':')[1])){
            return undefined;
        } else {
            return rumor;
        }
    }
}

function prepareWant() {
    var want = {};
    for (var rumor in rumors) {
        var index = rumors[rumor].Rumor.MessageID.split(':')[0];
        var messagenum = rumors[rumor].Rumor.MessageID.split(':')[1];
        if (want[index] === undefined || want[index] < parseInt(messagenum)) {
            want[index] = parseInt(messagenum);
        }
    }
    var message = {
        "Want": want,
        "EndPoint": url
    }
    return message;
}

function prepareMsg(peer) {

    var rand = Math.floor(Math.random() * 10) % 2;
    if (rand === 0) {
        return prepareRumor(peer);
    } else if (rand ===1) {
        return prepareWant(peer);
    }
}

function sendMsg() {
    var peer = getPeer();
    if (peer != undefined) {
        var message = prepareMsg(peer);
        if (message !== undefined) {
            request.post({
            headers: {'content-type' : 'application/json'},
            url: peer.url,
             body: JSON.stringify(message)
             }, function(error, response, body){
             });
        }
    }
}

app.get('/', function(req,res) {
    res.render('index', { id: id, messages: rumors });
});

app.get('/peer', function (req,res) {
    res.render('peer');
});

app.post('/sendMessage', function(req,res) {
    var message = req.body.message;
    url = req.protocol + '://' + req.get('host') + '/gossip';
    var messageid = id + ':' + nextid;
    nextid++;
    var constructedMessage = {
        "Rumor": {
            "MessageID": messageid,
            "Originator": name,
            "Text": message
        },
        "EndPoint": url
    };
    rumors.push(constructedMessage);
    res.redirect('/')
    res.render('index', { id: id, messages: rumors});
});

app.post('/addPeer', function(req, res){

    var neighbor = {
        "url": req.body.url,
        "name": req.body.name
    };
    neighbors.push(neighbor);
  res.render('index', { id: id, messages: rumors});
});

app.post('/gossip', function(req,res) {
    var message = req.body;
    if (message.Rumor !== undefined) {
        var check = false;
        for (var j in neighbors) {
            if (neighbors[j].url === message.EndPoint) {
                check = true;
            }
        }
        if (check == false) {
            neighbors.push({name: message.Rumor.MessageID.split(':')[0], url: message.EndPoint})
        }
        for (var i in rumors) {
            if (rumors[i].Rumor.MessageID === message.Rumor.MessageID) {
                return;
            }
        }
        rumors.push(message);
    } else if (message.Want !== undefined) {
        var check = false;
        for (var j in neighbors) {
            if (neighbors[j].url === message.EndPoint) {
                check = true;
            }
        }
        if (check == false) {
            neighbors.push({name: message.Want[message.Want.keys()[0]], url: message.Want.EndPoint})
        }
        wants[message.EndPoint] = message
    }
});
