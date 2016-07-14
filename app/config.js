module.exports = {
    
    database: {
        host: process.env.DB_HOST || "localhost",
        port: process.env.DB_PORT || "3306",
        user: "root",
        pass: "root",
        name: "balloon_test2"
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