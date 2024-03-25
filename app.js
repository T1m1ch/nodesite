const https = require("https");
const http = require("http");

const os = require("os");
const fs = require("fs");
const url = require("url");
const qs = require("querystring");
const mongoose = require("mongoose");

let mime_types = new Map();
mime_types.set("html", "text/html");
mime_types.set("css", "text/css");
mime_types.set("js", "text/javascript");
mime_types.set("jpeg", "image/jpeg");
mime_types.set("jpg", "image/jpeg");
mime_types.set("png", "image/png");
mime_types.set("gif", "image/gif");
mime_types.set("svg", "image/svg+xml");
mime_types.set("mp4", "video/mp4")

mongoose.connect("mongodb://localhost/pmgdb", {})
    .then(() => console.log("MongoDB Connectend"))
    .catch(err => console.log(err));

const event_schema = new mongoose.Schema({
    name: String,
    description: String,
    date: String,
    price: Number,
    adress: String,
    organization: String,
    phone: String,
    email: String,
    link: String,
    images: Number
});

const events = mongoose.model("events", event_schema);

function home(request, response, query) {
    response.setHeader("Content-Type", "text/html");
    fs.createReadStream("./index.html").pipe(response);
}

function get_event_list(request, response, query) {
    events.find({})
        .then(event_list => {
            let event_ids = event_list.map(event => event._id.toString());
            console.log(event_ids);
            response.statusCode = 200;
            response.setHeader("Content-Type", "application/json");
            response.end(JSON.stringify(event_ids));
        })
        .catch(err => {
            console.log(err);
            response.statusCode = 404;
            response.setHeader("Content-Type", "text/plain");
            response.end();
        });

}

function get_event_info(request, response, query) {
    let template = { _id: query.id }
    events.findOne(template)
        .select("-_id")
        .then(result => {
            if (result) {
                response.statusCode = 200;
                response.write(JSON.stringify(result));
            } else {
                console.log("Запись не найдена");
                response.statusCode = 404;
            }
            response.end();
        })
        .catch(err => {
            console.log(err)
            response.statusCode = 400;
            response.end();
        })
}

function upload_event(request, response, query) {
    let body = '';
    request.on("data", chunk => {
        body += chunk.toString();
    });

    request.on("end", () => {
        console.log(body)
        const json_document = JSON.parse(body);
        const document = events(json_document);
        document.save()
            .then(() => {
                response.statusCode = 200;
                response.setHeader("Content-Type", "text/plain");
                response.end();
            })
            .catch((err) => {
                response.statusCode = 400;
                response.setHeader("Content-Type", "text/plain");
                response.end();
            });
    });
}

function delete_event(request, response, query) {
    let template = { _id: query.id };
    events.deleteOne(template)
        .then(() => {
            response.statusCode = 200;
            response.end();
        })
        .catch(err => {
            response.statusCode = 404;
            response.end();
        });
}

let handlers = new Map();
handlers.set("/", home);
handlers.set("/get_event_list", get_event_list);
handlers.set("/get_event_info", get_event_info);
handlers.set("/upload_event", upload_event);
handlers.set("/delete_event", delete_event);

const options = {
    key: fs.readFileSync('./cert/privkey.pem'),
    cert: fs.readFileSync('./cert/fullchain.pem')
};

https.createServer(options, function(request, response) {
    let url_parts = url.parse(request.url, true);
    let path = url_parts.pathname;
    let query = url_parts.query;

    console.log(request.url);

    if (handlers.has(path)) {
        handlers.get(path)(request, response, query);
    } else if (path.includes(".")) {
        if (path.includes("acme-challenge")) {
            response.end(path.slice(28) + ".GZFKVH10R4UOelymqQ8F1FJpsJqYGclb-OaSI-F4-K0");
        } else {
            let file_extension = path.slice(path.lastIndexOf(".") + 1);
            let fpath = path.slice(1);
            fs.access(fpath, fs.constants.R_OK, (err) => {
                if (err) {
                    response.statusCode = 404;
                    response.setHeader("Content-Type", "text/plain");
                    response.end();
                    return;
                }
                if (mime_types.has(file_extension)) {
                    response.setHeader("Content-Type", mime_types.get(file_extension));
                    fs.createReadStream(fpath).pipe(response);
                } else {
                    response.statusCode = 400;
                    response.setHeader("Content-Type", "text/plain");
                    response.end();
                }
            })
        }
    } else {
        response.end();
    }
}).listen(443, function() {
    console.log("Server is listening 443");
});