// mock KMS.decrypt from aws-sdk
var AWS = require("aws-sdk-mock");

AWS.mock("KMS", "decrypt", (params, callback) => {
    callback(null, { Plaintext: "abcdefghijklmnopqrstuvwxyz" });
});

// set up lambda environment
require("dotenv").config(); // eslint: don't assign

var chai = require("chai");
var assert = chai.assert;
chai.use(require("chai-string"));

//var assert = require("assert");
var handler = require("../index.js");

// factory fn for minimal SNS events
var createEvent = function(subject, hasRecords) {
    var nested = {
        "AlarmName": subject,
        "AlarmDescription": "Raise alarm if CPU...",
        "NewStateValue": "ALARM",
        "NewStateReason": "Threshold Crossed: ...",
        "Region": "EU - Ireland",
        "Trigger": {
            "MetricName": "CPUUtilization",
            "Dimensions": [ {
                "name": "AutoScalingGroupName", // got to pick one
                "value": "mystack-Group"
            } ]
        }
    };

    return (hasRecords) ? {
        Records: [ {
            Sns: {
                Subject: subject,
                Message: JSON.stringify(nested)
            }
        } ]
    } : nested;
};

describe("PostAlert", function() {
    //instance info
    describe("Information event", function() {
        it("should produce information object", function() {
            var subject = "Information";
            var event = createEvent(subject);
            handler.handler(event, null, function(err, data) {
                assert.hasAllKeys(data.slackMessage, ["channel", "text", "username", "icon_emoji"]);
                assert.startsWith(data.slackMessage.icon_emoji, ":information_source:");
                assert.endsWith(data.slackMessage.text, "}```");
            });
        });
    });

    //auto scaling warning
    describe("Warning event", function() {
        it("should produce warning object", function() {
            var subject = "Warning";
            var event = createEvent(subject, true); // place event in Records array
            handler.handler(event, null, function(err, data) {
                assert.hasAllKeys(data.slackMessage, ["channel", "text", "username", "icon_emoji"]);
                assert.startsWith(data.slackMessage.icon_emoji, ":warning:");
                assert.endsWith(data.slackMessage.text, "}```");
            });
        });
    });

    //instance error
    describe("Error event", function() {
        it("should produce error object", function() {
            var subject = "Error";
            var event = createEvent(subject, false);
            handler.handler(event, null, function(err, data) {
                assert.hasAllKeys(data.slackMessage, ["channel", "text", "username", "icon_emoji"]);
                assert.startsWith(data.slackMessage.icon_emoji, ":fire:");
                assert.endsWith(data.slackMessage.text, "}```");
            });
        });
    });

    //undefined error
    describe("Unexpected event", function() {
        it("should produce warning object", function() {
            var subject = "Error";
            var event = { "this_event_is": "unexpected" };
            handler.handler(event, null, function(err, data) {
                assert.hasAllKeys(data.slackMessage, ["channel", "text", "username", "icon_emoji"]);
                assert.startsWith(data.slackMessage.icon_emoji, ":warning:");
                assert.endsWith(data.slackMessage.text, "}```");
            });
        });
    });

});
