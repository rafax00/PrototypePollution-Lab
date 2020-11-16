const express = require("express");
const routes = express.Router();
const crypto = require("crypto");
const { exec } = require("child_process");
const extend = require("node.extend");

const credentials = ['{"username":"admin", "password": "' + crypto.randomBytes(64).toString("hex") + '", "cookie": "' + crypto.randomBytes(64).toString("hex") + '", "isAdmin":true}',
'{"username":"guest", "password":"pass123", "cookie": "' + crypto.randomBytes(64).toString("hex") + '"}'];

function getCookie(req){
    if(req.headers.cookie && req.headers.cookie.includes("=")){
        return req.headers.cookie.split("=")[1]
    }
}

function checkLogin(req){
    if (checkCookie(getCookie(req))){
            return true;
    }else{
        return false;
    }
}

function checkAdmin(receivedCookie){
    for (i=0; i<credentials.length; i++){
        credential = JSON.parse(credentials[i]);
        if (credential.cookie === receivedCookie){
            return credential.isAdmin;
        }
    }
    return false;
}

function checkCredentials(username, password){
    for (i=0; i<credentials.length; i++){
        credential = JSON.parse(credentials[i]);
        if (credential.username === username && credential.password === password){
            return credential.cookie;
        }
    }
    return false;
}

function checkCookie(receivedCookie){
    for (i=0; i<credentials.length; i++){
        credential = JSON.parse(credentials[i]);
        if (credential.cookie == receivedCookie){
            return true;
        }
    }
    return false;
}

// //*Security Log*\\ Feature to security analysis, with this we can detect incoming attacks to your server
function securityLog(request, isLogedin){
    var log = {};
    extend(true, log, request, {isLogedin:isLogedin, date:Date.now()});

    console.log("::! Security Log Audit !:: " + JSON.stringify(log));
}

routes.get("/", (req, res) => {
    var isLogedin = checkLogin(req)

    if(isLogedin){
        return res.status(301).redirect("/admin");
    }
    return res.status(301).redirect("/login");
});

routes.get("/login", (req, res) => {
    return res.status(200).sendFile("./htmls/login.html", {root: __dirname});
});

routes.post("/login", (req, res) => {
    let credentials = req.body;
    let username = credentials.username;
    let password = credentials.password;

    var cookie = checkCredentials(username, password);
    if (cookie != false){
        res.cookie("admin_session", cookie,  { maxAge: 900000});
        return res.status(200).redirect("/admin");
    }else{
        return res.redirect("/login");
    }
});

routes.get("/admin", (req, res) => {
    var isLogedin = checkLogin(req)

    if (isLogedin){
        return res.sendFile("./htmls/admin.html", {root:__dirname});
    }
    return res.status(401).send("Forbidden");
});

routes.post("/admin/check_url", (req, res) => {
    var isLogedin = checkLogin(req);
    var url = req.body.url;

    if(isLogedin){
        if (checkAdmin(getCookie(req))){
            exec("wget " + url + " -O ./downloads/last_url_download.html --no-check-certificate", (error, stdout, stderr) => {
                if (error) {
                    console.log(error.message); 
                }else if (stderr) {
                    console.log(stderr);
                }else{
                    console.log("command executed");
                }
            });
        
            return res.status(200).send("File Downloaded");
        }else{
            return res.status(200).send("you are not the admin");
        }
    }else{
        securityLog(req.body, isLogedin);
        return res.status(401).send("Forbidden");
    }
});

routes.get("/admin/downloads/last_url_download.html", (req, res) => {
    var isLogedin = checkLogin(req);

    if(!isLogedin){
        return res.status(401).send("Forbidden");
    }
    if (checkAdmin(getCookie(req))){
        return res.status(200).download("./downloads/last_url_download.html");
    }

    return res.status(200).send("<script>alert('you are not the admin')</script>");
});

routes.get("/css/login.css", (req, res) => {
    return res.status(200).sendFile("./css/login.css", {root: __dirname});
});

routes.get("/css/admin.css", (req, res) => {
    return res.status(200).sendFile("./css/admin.css", {root: __dirname});
});

module.exports = routes;
