# Email This

When working on html emails locally, just right click > "Email This" to send the html through smtp. 

## Features

Does nothing but send emails. 

To configre run "Email This : Update Settings" from the command pallette. 

## Requirements

An SMTP Server to send emails through and an html file to send.

## Extension Settings

This extension contributes the following settings:

* `emailThis.smtp.host`: The SMTP Server we are going to send through
* `emailThis.smtp.port`: SMTP Port
* `emailThis.smtp.authenticate`: Boolean whether or not we want to send username / password
* `emailThis.emailFrom`: From email address
* `emailThis.emailTo`: To email address
* `emailThis.emailCc`: Optional, CC email address or comma separated list of email addresses
* `emailThis.emailBcc`: Optional, Bcc email address or comma separated list of email addresses
* `emailThis.emailSubject`: Email Subject

## Changelog
To check full changelog [click here](CHANGELOG.md).

## LICENSE
This extension is licensed under the [MIT License](LICENSE)