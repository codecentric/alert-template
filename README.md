# alert-template
CloudFormation template and lambda for Slack alerts from CloudWatch alarms. Supports cluster, service, auto scaling and instance alarms.

To use this template, be sure to install Node.js and the AWK SDK. That done, `cd` to the repository root and run `npm install`.

Next, you create an S3 bucket and enter its name in `.env`. 

Finally, build everything and sync the files to S3:

```
$ node_modules/gulp/bin/gulp.js build
```

The `build` task lints, validates and tests the inputs before syncing files to S3. Alternatively, you can call the `lint`, `validate` and `test` tasks individually before building and syncing.

## Sample host template
To create a basic monitored stack, instantiate `cfn/host-template.yml` in the CloudFormation web console or at the command line.
```
$ aws cloudformation create-stack --stack-name alert-test-stack --template-body file://host-template.yml
  --parameters
    ParameterKey=AlertHookUrlBase64,ParameterValue=...
    ParameterKey=KeyName,ParameterValue=...
    ParameterKey=S3Bucket,ParameterValue=...
    ParameterKey=S3LambdaKey,ParameterValue=post-slack-alert-0.1.0.zip
    ParameterKey=S3TemplateKey,ParameterValue=alert-template.yml 
    ParameterKey=Stage,ParameterValue=test
  --capabilities
    CAPABILITY_IAM
```
`AlertHookUrlBase64` is the base64-encoded URL of the Slack webhook (including the leading `https://`). `KeyName` has to match an existing key pair (e.g. `ssh-user`). The parameter `S3Bucket` is the name of the bucket referenced in `.env` and used to sync templates and lambda to S3.

## Adding the template to existing stacks
To add a nested alert stack to an existing template defining an ECS service, auto scaling group or EC2 instance, add the following parameters and resource:
```
Parameters:
  Stage:
    Description: Stage
    Type: String
    Default: "test"
    AllowedPattern: "(test|prod)"
    ConstraintDescription: set stage to `test` or `prod`
  S3Bucket:
    Description: Bucket holding template and lambda
    Type: String
    Default: "alert-template"
  S3TemplateKey:
    Description: Template key
    Type: String
    Default: alert-template.yml
  S3LambdaKey:
    Description: Lambda key
    Type: String
    Default: post-slack-alert-0.1.0.zip
  AlertHookUrlBase64:
    Description: Base64-encoded Slack hook URL
    Type: String
Resources:
  ...
  AlertStack:
    Type: "AWS::CloudFormation::Stack"
    Properties:
      Parameters:
        "Stage": !Ref "Stage"
        "EC2InstanceId": !Ref "logical name of Ec2 instance..."
        "S3Bucket": !Ref "S3Bucket"
        "S3Key": !Ref "S3LambdaKey"
        "SlackHookUrlBase64": !Ref "AlertHookUrlBase64"
      TemplateURL: !Sub "https://s3-${AWS::Region}.amazonaws.com/${S3Bucket}/${S3TemplateKey}"
      TimeoutInMinutes: 8
    DependsOn: Host
```
Note that the S3 bucket must be local to the stack's AWS region.
