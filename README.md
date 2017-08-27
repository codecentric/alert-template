# alert-template
CloudFormation template and lambda for Slack alerts from CloudWatch alarms. Supports cluster, service, auto scaling and instance alarms.

To use this template, be sure to install Node.js and the AWK SDK. That done, `cd` to the repository root and run `npm install`.

Next, you need to create an S3 bucket and enter its name in `.env`. 

Finally, build everything and sync the files to S3:

```
$ node_modules/gulp/bin/gulp build
```

The `build` task lints, validates and tests the inputs before syncing files to S3.

