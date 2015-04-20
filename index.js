
AWS = require("aws-sdk");
q = require("q");

// AWS.config.loadFromPath('./config.json'); // only if runnin locally
var ses = new AWS.SES();
var s3 = new AWS.S3();

function _loadDestination(bucket, folder) {
    var deferred = q.defer();

    s3.getObject({
            Bucket: bucket,
            Key: folder + "/to-notify.json"
        }, function(err, data) {
            if (err) {
                console.log(err, err.stack);
                deferred.reject(err);
            } else {
                var fileContent = data.Body.toString('utf8');
                deferred.resolve(JSON.parse(fileContent));
            }
        }
    );

    return deferred.promise;
}

function notifyByEmail(reportName, reportUrl, toAddress) {
    var params = {
      Destination: { /* required */
        ToAddresses: toAddress
      },
      Message: { /* required */
        Body: { /* required */
          // Html: {
          //   Data: 'STRING_VALUE', /* required */
          //   Charset: 'STRING_VALUE'
          // },
          Text: {
            Data: 'Report ' + reportName + ' is ready: ' + reportUrl,
            Charset: 'UTF-8'
          }
        },
        Subject: { /* required */
          Data: 'A new report ' + reportName + ' is ready!', /* required */
          Charset: 'UTF-8'
        }
      },
      Source: 'rodolfo.3@gmail.com', /* required */
      // ReplyToAddresses: [
      //   'noreply@geekie.com.br',
      // ],
      // ReturnPath: 'STRING_VALUE'
    };

    ses.sendEmail(params, function(err, data) {
      if (err) {
        // an error occurred
        console.log(err, err.stack);
      } else {
          // successful response
          console.log("notified!");
      }
    });
}

exports.handler = function(event, context) {
    console.info(event);
    event["Records"].map(function(record) {
        var s3Data = record["s3"];
        notifyIfReport(s3Data["bucket"]["name"], s3Data["object"]["key"]);
    });
};

function notify(bucketName, key) {
    var params = {
        Bucket: bucketName,
        Key: key,
        Expires: 24 * 60 * 60
    };
    var url = "http://" + bucketName + ".s3.amazonaws.com/" + key;

    var name = key.split('/')[1].split('-2015')[0];
    var folder = key.split('/')[0];
    _loadDestination(bucketName, folder).then(function(toAddress) {
        notifyByEmail(name, url, toAddress);
    });
}

function notifyIfReport(bucketName, key) {
    console.info(arguments);
    if (key.match(/^report/)) {
        notify(bucketName, key);
    } else {
        console.info("not a report");
    }
}
