var moment = require("moment");
var stackTrace = require("stack-trace");
var logger = require("./logger");
var ex = module.exports;


ex.getDateUTC = function () {
    return moment.utc().format("YYYY-MM-DD HH:mm:ss");
};

ex.makeError = function (message) {
    var er =  new Error(message);
    er.custom = true;
    return er;
};

ex.logError = function (err, non_custom) {
    if(non_custom && err.custom)
    {
            return;
    }
    var str = err.message + "\n[\n";
    var tracee = stackTrace.parse(err);

    for(var i = 0; i < tracee.length; i++)
    {
        var trace = tracee[i];
        str += "File: " + trace.getFileName() + ", func: " + trace.getFunctionName() + ", line: "
            + trace.getLineNumber()+"\n";
    }
    str+="]";
    logger.error(str);

};
ex.escapeSQLString = function (str) {
  return str.replace(/'/g, "''")
};