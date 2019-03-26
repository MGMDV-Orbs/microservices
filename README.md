# Orb: microservices
An orb containing common abstracted commands and jobs for building and deploying MGM microservices.

https://circleci.com/orbs/registry/orb/mgmorbs/microservices

## Usage

### Simple Usage with Workflows

This is an example of a drop-in CircleCI configuration that can be placed at `.circleci/config.yml` for any microservice for (almost) out-of-the-box builds.

This Orb depends on each service to implement `build tag export-image push-image-to-ecr ci-test-unit ci-test-integration ci-lint deploy` make targets.

```yml
version: 2.1

orbs:
  ms: mgmorbs/microservices@1

workflows:
  version: 2
  build_and_test:
    jobs:
      - ms/setup-env:
          context: microservices
          filters:
              tags:
                only: /^v.*/
      - ms/build-image:
          context: microservices
          requires:
            - ms/setup-env
          filters:
              tags:
                only: /^v.*/
      - ms/push-image:
          context: microservices
          requires:
            - ms/build-image
            - ms/run-unit-tests
            - ms/run-integration-tests
            - ms/run-lint
            - ms/npm-audit
          filters:
              tags:
                only: /^v.*/
      - ms/run-unit-tests:
          context: microservices
          requires:
            - ms/build-image
          filters:
              tags:
                only: /^v.*/
      - ms/run-integration-tests:
          context: microservices
          requires:
            - ms/build-image
          filters:
              tags:
                only: /^v.*/
      - ms/run-lint:
          filters:
              tags:
                only: /^v.*/
      - ms/npm-audit:
          filters:
              tags:
                only: /^v.*/
      - hold:
          type: approval
          requires:
            - ms/push-image
          filters:
            branches:
              only:
                - prod
      - ms/deploy-svc:
          context: microservices
          requires:
            - hold
            - ms/push-image
      - ms/publish-aws-lambdas:
          context: microservices-okta
          requires:
            - ms/setup-env
            - ms/build-image
            - ms/run-unit-tests
            - ms/run-integration-tests
            - ms/run-lint
          filters:
            tags:
              only: /^v.*/
```

### Advanced Usage with Commands
You may also choose to call the discrete commands exposed by this orb directly within your inline jobs.

All commands exposed by this Orb can be found [here](#orb-registry-url)(TODO).

For example, this Circle CI `config.yml` calls the `print-diagnostics` command exposed by `microservices` Orb within its own job definition

```yml
version: 2.1

orbs:
  ms: mgmresorts/microservices@1

jobs:
  initial-setup:
    executor: vpn/aws
    steps:
      - ms/print-diagnostics
      - run: echo "Custom step after ms Orb command"

```

## Contributing

### Changes
All changes should can made in `microservices.yml`.

### Publishing
Before pubishing, changes should be tested via:

```bash
# validates circleci orb syntax
$ circleci orb validate microservices.yml

# prints out processed orb; Check it visually
$ circleci orb process microservices.yml

# publish the orb to CircleCI Orb Registry
$ circleci orb publish ./microservices.yml mgmorbs/microservices@{semantic version}
```

For the (last) publish command, you can alternatively publish the orb to a dev version and ask an admin to promote to a semantic version by using:

```
circleci orb publish ./microservices.yml mgmorbs/microservices@dev:latest
```

## Architecture

This orb:
- depends on the [vpn orb](https://github.com/MGMDV-Orbs/vpn/).
- depends on [Okta AWS Assume Role CLI](https://github.com/oktadeveloper/okta-aws-cli-assume-role) to setup a trusted session for AWS CLI.
- exposes Jobs that can be used as drop-in with workflows (see Usage section)
- exposes underlying discrete Steps used by these Jobs
- requires usage of `microservices` context (see Usage section)

### Commands
Commands in this Orb are discrete, common operations across services, with clear descriptions, and are parameterized for extensibility.

### Jobs
Jobs exposed by this Orb are intended to be for drop-in usage of a subset of exposed commands.

### Lambdas
Use the `publish-aws-lambdas` job found in this drop-in CircleCI configuration with the microservices by adding the following to the CircleCI configuration:

```
- ms/publish-aws-lambdas:
    context: microservices-okta
    requires:
      - ms/setup-env
      - ms/run-unit-tests
      - ms/run-integration-tests
      - ms/run-lint
    filters:
      tags:
        only: /^v.*/
```

After updating the CircleCI configuration, create a directory named `faas` in the root level and add a lambda directory structure following this example:

```
faas
  - main.tf
  - { lambdaName }
    - src
      - { files for lambda code }
      - package.json (optional)
    - main.tf
```

`faas/main.tf` is required as the terraform entrypoint where all project resources are referenced as [Terraform Modules](https://www.terraform.io/docs/configuration/modules.html).

```tf
# Module to wrap module
module "activate-profile" {
  # path to lambda directory
  source = "./activate-profile"

  # Environment variables used by lambda's main.tf
  NODE_ENV = "${var.NODE_ENV}"
  LAMBDA_EXECUTION_ROLE = "${var.LAMBDA_EXECUTION_ROLE}"
  GSE_HOST = "${var.GSE_HOST}"
  SERVICE = "${var.SERVICE}"
}
```

`faas/{lambda}/main.tf` is the individual lambda terraform.

```tf
# Variables used in this tf
variable "NODE_ENV" {}
variable "LAMBDA_EXECUTION_ROLE" {}
variable "GSE_HOST" {}
variable "SERVICE" {}

# Zip the lambda and deps (AWS requirement)
data "archive_file" "zip" {
  type        = "zip"
  source_dir  = "${path.module}/src"
  output_path = "${path.module}/lambda_function_payload.zip"
}

# define lambda configuration
resource "aws_lambda_function" "activate_profile" {
  filename         = "${data.archive_file.zip.output_path}"
  function_name    = "${var.NODE_ENV}_${var.SERVICE}_activate_profile"
  role             = "${var.LAMBDA_EXECUTION_ROLE}"
  handler          = "index.handler"
  source_code_hash = "${data.archive_file.zip.output_base64sha256}"
  runtime          = "nodejs8.10"

  # publish new immutible version on each deploy
  publish          = true

  # environment variables injected into lambda
  environment {
    variables = {
      GSE_HOST = "${var.GSE_HOST}"
      FILTER_ROOM_STATES = "${var.FILTER_ROOM_STATES}"
    }
  }
}

# point this alias to the current deployment version of lambda
resource "aws_lambda_alias" "live" {
  name             = "live"
  function_name    = "${aws_lambda_function.activate_profile.arn}"
  function_version = "${aws_lambda_function.activate_profile.version}"
}
```