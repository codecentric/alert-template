#!/bin/bash
export cfn_template_name=remind-me-cfn-nested-templates
export region=eu-west-1
for f in *.yml; do
  aws cloudformation validate-template --template-url https://s3-$region.amazonaws.com/$cfn_template_name/$f
	if [ $? -ne 0 ]; then
  	echo "validation for ${f} failed"
  	exit 1
  fi
done
aws s3 sync . s3://$cfn_template_name
