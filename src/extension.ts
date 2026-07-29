// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import nodemailer from "nodemailer";
import Mail from "nodemailer/lib/mailer";
import type { Address, Options } from "nodemailer/lib/mailer";
import SMTPConnection from "nodemailer/lib/smtp-connection";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  const sendThis = vscode.commands.registerCommand(
    "email-this.sendThis",
    async (uri?: vscode.Uri) => {
      if (!uri) {
        vscode.window.showErrorMessage("No file selected.");
        return;
      }

      const emailBodyAsBytes = await vscode.workspace.fs.readFile(uri);
      const emailBodyAsString = Buffer.from(emailBodyAsBytes).toString("utf8");

      let config = vscode.workspace.getConfiguration("emailThis");

      //email info
      let emailFrom = config.get<string>("emailFrom");
      let emailTo = config.get<string>("emailTo");
      let emailCc = config.get<string>("emailCc");
      let emailBcc = config.get<string>("emailBcc");
      let emailSubject = config.get<string>("emailSubject");

      //smtp info
      let smtpHost = config.get<string>("smtp.host");
      let smtpPort = config.get<number>("smtp.port");
      let smtpSkipAuthentication = config.get<boolean>(
        "smtp.skipAuthentication",
      );
      let smtpUsername = await context.secrets.get("emailThis.smtp.username");
      let smtpPassword = await context.secrets.get("emailThis.smtp.password");

      //make sure we have the minimum settings to actually send an email
      if (
        emailFrom === "" ||
        emailTo === "" ||
        emailSubject === "" ||
        smtpHost === "" ||
        smtpPort === undefined ||
        (smtpSkipAuthentication === false && (!smtpUsername || !smtpPassword))
      ) {
        vscode.window.showErrorMessage(
          'Missing settings. Run "Email This: Update Settings" first.',
        );
        return;
      }

      //make api request to send email
      //callback to upate with response
      //do we want to check if delivered
      //fetch call to mailgun here

      //get the smtp connection stuff we need
      const smtpTransportOptions: SMTPConnection.Options = {
        host: smtpHost,
        port: smtpPort,
        secure: false, // true for port 465, false for other ports like 587
      };

      //if we want to send credentials set them
      if (!smtpSkipAuthentication) {
        smtpTransportOptions.auth = {
          user: smtpUsername,
          pass: smtpPassword,
        };
      }

      //set the email stuff we need
      const emailOptions: Mail.Options = {
        from: emailFrom,
        to: emailTo,
        subject: emailSubject,
        text: "",
        html: emailBodyAsString,
      };

      //create an instance of the transporter
      const transporter = nodemailer.createTransport(smtpTransportOptions);

      try {
        await transporter.verify();
        console.log("Server is ready to take our messages");
      } catch (err) {
        console.error("Verification failed:", err);
      }

      try {
        const info = await transporter.sendMail(emailOptions);
        vscode.window.showInformationMessage("Email Sent to " + emailTo);
      } catch (err) {
        vscode.window.showInformationMessage("Boom! (in a bad way) : " + err);
        console.error(err);
      }
    },
  );

  const setApiKey = vscode.commands.registerCommand(
    "email-this.setApiKey",
    async () => {
      const apiKey = await vscode.window.showInputBox({
        prompt: "Enter your API key",
        password: true,
        ignoreFocusOut: true,
      });

      if (apiKey) {
        await context.secrets.store("emailThis.apiKey", apiKey);
        vscode.window.showInformationMessage("Email This: API key saved.");
      }
    },
  );

  const updateSettings = vscode.commands.registerCommand(
    "email-this.updateSettings",
    async () => {
      //get the settings
      const config = vscode.workspace.getConfiguration("emailThis");

      //step 1: emailFrom
      const emailFrom = await vscode.window.showInputBox({
        prompt: "Enter Email From Address",
        value: config.get("emailFrom"),
        ignoreFocusOut: true,
      });

      config.update("emailFrom", emailFrom);

      //step 2: emailTo
      const emailTo = await vscode.window.showInputBox({
        prompt: "Enter Email To Address",
        value: config.get("emailTo"),
        ignoreFocusOut: true,
      });

      config.update("emailTo", emailTo);

      //step 3: emailCc
      const emailCc = await vscode.window.showInputBox({
        prompt: "Enter Email CC Address",
        value: config.get("emailCc"),
        ignoreFocusOut: true,
      });

      config.update("emailCc", emailCc);

      //step 4: emailBcc
      const emailBcc = await vscode.window.showInputBox({
        prompt: "Enter Email Bcc Address",
        value: config.get("emailBcc"),
        ignoreFocusOut: true,
      });

      config.update("emailBcc", emailBcc);

      //step 5: emailSubject
      const emailSubject = await vscode.window.showInputBox({
        prompt: "Enter Email Subject",
        value: config.get("emailSubject"),
        ignoreFocusOut: true,
      });

      config.update("emailSubject", emailSubject);

      //step 6: smtpHost
      const smtpHost = await vscode.window.showInputBox({
        prompt: "Enter SMTP Host",
        value: config.get("smtp.host"),
        ignoreFocusOut: true,
      });

      config.update("smtp.host", smtpHost);

      //step 7: smtpPort
      const smtpPort = await vscode.window.showInputBox({
        prompt: "Enter SMTP Port",
        value: config.get("smtp.port"),
        ignoreFocusOut: true,
      });

      config.update("smtp.port", smtpPort);

      //step 8: smtpUsername
      let savedSmtpUsername = await context.secrets.get(
        "emailThis.smtp.username",
      );

      const smtpUsername = await vscode.window.showInputBox({
        prompt: "Enter SMTP Username",
        value: savedSmtpUsername,
        ignoreFocusOut: true,
      });

      await context.secrets.store(
        "emailThis.smtp.username",
        smtpUsername || "",
      );

      //step 9: smtpPassword
      let savedSmtpPassword = await context.secrets.get(
        "emailThis.smtp.password",
      );

      const smtpPassword = await vscode.window.showInputBox({
        prompt: "Enter your SMTP Password",
        placeHolder: savedSmtpPassword ? "•••••••• (already set — leave blank to keep)" : "",
        ignoreFocusOut: true,
        password: true
      });

      if(smtpPassword){
          await context.secrets.store(
          "emailThis.smtp.password",
          smtpPassword || "",
        );
      }
    },
  );

  context.subscriptions.push(sendThis);
}

// This method is called when your extension is deactivated
export function deactivate() {}
