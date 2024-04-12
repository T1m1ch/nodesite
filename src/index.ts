import express from "express";

const app = express();

app.use(express.static("./public"));

app.get("/", (request, response) => {

});

app.listen(8000);