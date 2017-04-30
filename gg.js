var rp = require("request-promise");
var options = {
    method: 'POST',
    uri: 'https://balloonmail-app.azurewebsites.net/balloons/refill',
    body:  {
        "balloon_id":5
    },
    json: true, // Automatically stringifies the body to JSON,
    headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE0OTMzNTM4OTMsInN1YiI6MX0.G7TOL7QVdZIiRtWdkgWZN-mwa3kV3kmlZux5IO0597I"
    }
};

return rp(options)
    .then(res => {
        console.log(res);
    })
    .catch(err => {
        console.error(err);
    });