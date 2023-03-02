# Offboarding Automation

This project automates the removal of users from our services as part of the
offboarding process.

<details>
<summary>Useful links</summary>

- Confluence doc:
  https://ac3-wiki.atlassian.net/wiki/spaces/CAST/pages/4040458353/Offboarding+Automation+WIP
- Temporary repo: https://github.com/atenni/offboarding-automation
</details>

<details>
<summary>TODOs</summary>

- [x] Push to personal GitHub repo
- [ ] Bootstrap CDK into sandbox acct (profile: TEMP-personalAwsAcct)
  - _Obviously this should just be infra-as-code and not include anything AC3
    specific._
- [x] Set up prettier
- [ ] CI/CD tests and code quality
- [ ] CI/CD deployment
- [ ] Implement [Lambda PowerTools]
- [ ] Write helper functions for DDB queries
- [ ] Write quick dev helper script to populate/reset local DDB with sample data
- [ ] Write tests for all functions
- [ ] Report on test coverage
- [ ] ~Write tests for all CDK stacks?
- [ ] Set up sample events for local dev
- [ ] Set up `npm run` scripts for local dev (lambda, DDB, and step functions)
- [ ] Make doco great (keep in sync with [Confluence doc])
- [ ] Add repo badges

[Lambda PowerTools]:
  https://awslabs.github.io/aws-lambda-powertools-typescript/latest/
[Confluence doc]:
  https://ac3-wiki.atlassian.net/wiki/spaces/CAST/pages/4040458353/Offboarding+Automation+WIP

</details>

<details>
<summary>Useful commands</summary>

- `npm run build` compile typescript to js
- `npm run watch` watch for changes and compile
- `npm run test` perform the jest unit tests
- `cdk deploy` deploy this stack to your default AWS account/region
- `cdk diff` compare deployed stack with current state
- `cdk synth` emits the synthesized CloudFormation template
</details>

---

- [Architecture](#architecture)
  - [Queue offboarding stack](#queue-offboarding-stack)
  - [Process offboarding stack](#process-offboarding-stack)

---

# Architecture

At a high level this project consists of two decoupled processes that are
implemented as two CDK stacks:

1. Queuing a user for offboarding – `QueueOffboardingStack`
2. Processing the offboarding task at a later date - `ProcessOffboardingStack`

## Queue offboarding stack

CDK stack name: `QueueOffboardingStack`

```mermaid
flowchart LR;
  service_now("<u>SNOW webhook</u>
    - email
    - offboarding_date
    - snow_id
  ");

  lambda[["
    <u>AWS Lambda</u>
    With function URL
  "]]

  ddb[("
    <u>AWS DDB</u>
    - email: text
    - offboarding_date: date
    - snow_id: id
    - created_at: date
    - updated_at: date
    - status: enum
  ")]

  service_now --> lambda
  lambda --> ddb
```

Possible values for DDB `status` enum:

- `QUEUED`
- `IN_PROGRESS`
- `ERROR`
- `SUCCESS`

## Process offboarding stack

CDK stack name: `ProcessOffboardingStack`

```mermaid
flowchart LR;
  eventBridge("
    <u>EventBridge</u>
    Daily scheduled event
  ")
  stepFunc(<u>AWS Step Function</u>)

  eventBridge --> stepFunc

  stepFunc --> Zoom[[Zoom]]
  stepFunc --> Slack[[Slack]]
  stepFunc --> GitHub[[GitHub]]
  stepFunc --> Atlassian[[Atlassian]]
  stepFunc --> LucidChart[[LucidChart]]

  subgraph services ["Parallel Step Functions"]
    direction TB
      Zoom
      Slack
      GitHub
      Atlassian
      LucidChart
  end

  result{Success?}

  Zoom --> result
  Slack --> result
  GitHub --> result
  Atlassian --> result
  LucidChart --> result

  result --Yes--> success["
    <u>Report:</u>
    - update original SNOW task
    - Slack notification
  "]

  result --No--> failure[Notify CAST team<br>about with failure details]

```

**Note** – each parrallel step function will need to:

1. Query for the user by supplied email address
2. Deactivate user
3. Revoke andy access tokens
