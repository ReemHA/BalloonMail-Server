var path = require("path")
module.exports = {
    
    database: {
        host: "localhost",
        port: "1433",
        user: "sa",
        pass: "admin",
        name: "balloon_mail_db",
        pool: {
            max: 30,
            min: 8,
            idleTimeoutMillis: 30000
        },
        schema_file: path.join(__dirname, "schema.sql")
    },
    group_limit: 256,
    send_possible_counts: [2,4],

    //don't touch
    alchemy_key: "4eacae0efe2509a24654baaac00cd2b1120abdf3",
    web_client_id : "113808451021-5bbh4fp49eo7tdq8j93arot30tt49q8j.apps.googleusercontent.com",
    gcm_key: "AIzaSyBwiAhK-yCIX94zQnzB8uyKDQG73rmXoZ4",
    gcm_retry_count: 6,
    secret: "reem-hamdy-#4988%6-secret"
};