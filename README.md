# Orb: microservices
An orb containing common abstracted commands and jobs for building and deploying MGM microservices.

https://circleci.com/orbs/registry/orb/mgmorbs/microservices

## Usage

### Simple Usage with Workflows

This is an example of a drop-in CircleCI configuration that can be placed at `.circleci/config.yml` for any microservice for out-of-the-box builds.

```yml
version: 2.1

orbs:
  microservices: mgmorbs/microservices@0.1.0

workflows:
  version: 2
  build_and_test:
    jobs:
      # Step 1: Fetches env config and prints diagnostic info
      - microservices/initial-setup:
          context: microservices

      # Step 2: Runs tests and assures they are passing
      - microservices/run-tests:
          requires:
            - microservices/initial-setup
          context: microservices

      # Step 3: Builds docker image and push to ECR
      - microservices/push-image-to-ecr:
          context: microservices
          requires:
            - microservices/run-tests
          filters:
            branches:
              only:
                - develop
                - qa4
                - uat
                - master

      # Step 4: Deploys built image to ECS by registring task and updating cluster
      - microservices/update-ecs-service:
          context: microservices
          requires:
            - microservices/push-image-to-ecr
          filters:
            branches:
              only:
                - develop
                - qa4
                - uat
                - master
```

### Advanced Usage with Commands
You may also choose to call the discrete commands exposed by this orb directly within your inline jobs.

All commands exposed by this Orb can be found [here](#orb-registry-url)(TODO).

For example, this Circle CI `config.yml` calls the `print-diagnostics` command exposed by `microservices` Orb within its own job definition

```yml
version: 2.1

orbs:
  microservices: mgmresorts/microservices@0.1.0

jobs:
  initial-setup:
    executor: vpn/aws
    steps:
      - microservices/print-diagnostics
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
- exposes Jobs that can be used as drop-in with workflows (see Usage section)
- exposes underlying discrete Steps used by these Jobs
- requires usage of `microservices` context (see Usage section)

### Commands
Commands in this Orb are discrete, common operations across services, with clear descriptions, and are parameterized for extensibility.

### Jobs
Jobs exposed by this Orb are intended to be for drop-in usage of a subset of exposed commands.
