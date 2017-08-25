"use strict";

// lambda for alert posts to Slack
// IN: CloudWatch alarm event relayed by SNS topic
// OUT: null after successful post
// for SDK access, declare `var AWS = require("aws-sdk");`
// remember to mock the used calls in test/test.js using `require("aws-sdk-mock")`
const url = require("url");
const https = require("https");

// The Slack channel to send a message to stored in the slackChannel environment variable
const slackChannel = process.env.slackChannel;
// Slack hook URL
const hookUrl = process.env.hookUrl;
// Dry run switch for testing
const dryRun = process.env.dryRun.match(/true|yes|1/i);

function postMessage(message, callback) {
    const body = JSON.stringify(message);
    const options = url.parse(hookUrl);
    options.method = "POST";
    options.headers = {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
    };

    const postReq = https.request(options, (res) => {
        const chunks = [];
        res.setEncoding("utf8");
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
            if (callback) {
                callback({
                    body: chunks.join(""),
                    statusCode: res.statusCode,
                    statusMessage: res.statusMessage,
                });
            }
        });
        return res;
    });

    postReq.write(body);
    postReq.end();
}

function processEvent(event, callback) {
    var subjectText = "", messageText = "";
    
    if (event.AlarmName && event.Trigger) { // auto scaling event
        // autoscaling logic: no subject field, so build one
        subjectText = "*" + event.AlarmName.replace(/-[A-Z0-9]+\b/, "") + "*";
        messageText += buildAlarmDescription(event);
    } else if (event.Records && event.Records[0] && event.Records[0].Sns) { // generic SNS event
        var sns = event.Records[0].Sns;
        subjectText = "*" + sns.Subject + "*";
        var obj = JSON.parse(sns.Message);
        messageText += buildAlarmDescription(obj);
    } else {
        // fallback: we don't know the structure, only that an alarm has been raised
        // only the event itself is passed on (as it is for the others)
        subjectText = "*CloudWatch Alarm*";
    }

    //common to all event types
    messageText += "*Event*: ```" + JSON.stringify(event) + "```";
    
    var em = ":information_source:";
    if (subjectText.match(/warning|alarm/i)) {
        em = ":warning:";
    } else if (subjectText.match(/error/i)) {
        em = ":fire:";
    }

    const slackMessage = {
        username: "CloudWatch alert",
        channel: slackChannel,
        icon_emoji: em,
        text: `${subjectText}\n${messageText}`
    };
    
    if (dryRun) {
        callback(null, { "slackMessage": slackMessage, "event": event });
        return;
    }

    postMessage(slackMessage, (response) => {
        if (response.statusCode < 400) {
            console.info("Message posted successfully");
            callback(null);
        } else if (response.statusCode < 500) {
            console.error(`Error posting message to Slack API: ${response.statusCode} - ${response.statusMessage}`);
            callback(null);  // Don't retry because the error is due to a problem with the request
        } else {
            // Let Lambda retry
            callback(`Server error when processing message: ${response.statusCode} - ${response.statusMessage}`);
        }
    });
}

// buildAlarmDescription takes a standard CloudWatch event
// and returns the key fields as a multiline string
function buildAlarmDescription(obj) {
    var s =
        "*Name*: " + obj.AlarmName + "\n" +
        "*Description*: " + obj.AlarmDescription + "\n" +
        "*Reason*: " + obj.NewStateReason + "\n" +
        "*Metric*: " + obj.Trigger.MetricName + "\n" +
        "*Dimensions*:\n";
        
    var dimensions = obj.Trigger.Dimensions;
    for (var i = 0; i < dimensions.length; i++) {
        s += "- " +
            dimensions[i].name + " => " +
            dimensions[i].value + "\n";
    }
    return s;
}


exports.handler = (event, context, callback) => {
    if (hookUrl) {
        // Container reuse, simply process the event with the key in memory
        processEvent(event, callback);
    } else {
        callback("Hook URL has not been set.");
    }
};
