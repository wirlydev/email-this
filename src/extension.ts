// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import nodemailer from "nodemailer";
import Mail from "nodemailer/lib/mailer";
import type { Address, Options } from "nodemailer/lib/mailer";
import SMTPConnection from "nodemailer/lib/smtp-connection";

interface EmailConfig {
  emailFrom: string;
  emailTo: string;
  emailCc?: string;
  emailBcc?: string;
  emailSubject: string;
  smtpHost: string;
  smtpPort: number;
  smtpUsername?: string;
  smtpPassword?: string;
}

//read every setting/secret we need to send an email
//returns null when a required value is missing (or only one of username/password is set)
async function loadEmailConfig(
  context: vscode.ExtensionContext,
): Promise<EmailConfig | null> {
  const config = vscode.workspace.getConfiguration("emailThis");

  //email info
  const emailFrom = config.get<string>("emailFrom");
  const emailTo = config.get<string>("emailTo");
  const emailCc = config.get<string>("emailCc");
  const emailBcc = config.get<string>("emailBcc");
  const emailSubject = config.get<string>("emailSubject");

  //smtp info
  const smtpHost = config.get<string>("smtp.host");
  const smtpPort = config.get<number>("smtp.port");

  const smtpUsername = await context.secrets.get("emailThis.smtp.username");
  const smtpPassword = await context.secrets.get("emailThis.smtp.password");

  //make sure we have the minimum settings to actually send an email
  if (
    !emailFrom ||
    !emailTo ||
    !emailSubject ||
    !smtpHost ||
    smtpPort === undefined ||
    ((smtpUsername || smtpPassword) && (!smtpUsername || !smtpPassword))
  ) {
    return null;
  }

  return {
    emailFrom,
    emailTo,
    emailCc,
    emailBcc,
    emailSubject,
    smtpHost,
    smtpPort,
    smtpUsername,
    smtpPassword,
  };
}

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

      //load the settings we need; if anything's missing, offer to configure
      //and retry the send once the wizard closes
      let settings = await loadEmailConfig(context);
      if (!settings) {
        const pick = await vscode.window.showWarningMessage(
          "Email This isn't configured yet.",
          "Configure now",
        );
        if (pick !== "Configure now") {
          return;
        }

        await vscode.commands.executeCommand("email-this.updateSettings");

        settings = await loadEmailConfig(context);
        if (!settings) {
          vscode.window.showErrorMessage(
            "Email This is still missing required settings.",
          );
          return;
        }
      }

      const {
        emailFrom,
        emailTo,
        emailSubject,
        smtpHost,
        smtpPort,
        smtpUsername,
        smtpPassword,
      } = settings;

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
      if (smtpUsername || smtpPassword) {
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
        console.log("Transporter verified.");
      } catch (err) {
        console.log("Transporter failed to verify.");
        vscode.window.showErrorMessage("Unable to send email : " + err);
        return;
      }

      try {
        console.log("lets send some emails!");
        const sendEmailResults = await transporter.sendMail(emailOptions);

        //show email addresses that were rejected, if any
        if (sendEmailResults.rejected.length) {
          vscode.window.showErrorMessage(
            `These email addresses were rejected by the server : ${sendEmailResults.rejected.join(", ")}`,
          );
        }

        console.error(sendEmailResults);
      } catch (err) {
        vscode.window.showErrorMessage("Unable to send : " + err);
        console.error(err);
        return;
      }

      vscode.window.showInformationMessage("Email sent to : " + emailTo);
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

      await config.update("emailFrom", emailFrom, vscode.ConfigurationTarget.Global);

      //step 2: emailTo
      const emailTo = await vscode.window.showInputBox({
        prompt: "Enter Email To Address",
        value: config.get("emailTo"),
        ignoreFocusOut: true,
      });

      await config.update("emailTo", emailTo, vscode.ConfigurationTarget.Global);

      //step 3: emailCc
      const emailCc = await vscode.window.showInputBox({
        prompt: "Enter Email CC Address",
        value: config.get("emailCc"),
        ignoreFocusOut: true,
      });

      await config.update("emailCc", emailCc, vscode.ConfigurationTarget.Global);

      //step 4: emailBcc
      const emailBcc = await vscode.window.showInputBox({
        prompt: "Enter Email Bcc Address",
        value: config.get("emailBcc"),
        ignoreFocusOut: true,
      });

      await config.update("emailBcc", emailBcc, vscode.ConfigurationTarget.Global);

      //step 5: emailSubject
      const emailSubject = await vscode.window.showInputBox({
        prompt: "Enter Email Subject",
        value: config.get("emailSubject"),
        ignoreFocusOut: true,
      });

      await config.update("emailSubject", emailSubject, vscode.ConfigurationTarget.Global);

      //step 6: smtpHost
      const smtpHost = await vscode.window.showInputBox({
        prompt: "Enter SMTP Host",
        value: config.get("smtp.host"),
        ignoreFocusOut: true,
      });

      await config.update("smtp.host", smtpHost, vscode.ConfigurationTarget.Global);

      //step 7: smtpPort
      const smtpPort = await vscode.window.showInputBox({
        prompt: "Enter SMTP Port",
        value: config.get("smtp.port"),
        ignoreFocusOut: true,
      });

      await config.update("smtp.port", Number(smtpPort), vscode.ConfigurationTarget.Global);

      //step 8b: wanna authenticate?
      const smtpAuthChoice = await vscode.window.showQuickPick(["Yes", "No"],
        {prompt: "Authenticate?"}
      );

      await config.update("smtp.authenticate", smtpAuthChoice !== "No", vscode.ConfigurationTarget.Global);

      if (smtpAuthChoice === "Yes") {
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
          placeHolder: savedSmtpPassword
            ? "•••••••• (already set — leave blank to keep)"
            : "",
          ignoreFocusOut: true,
          password: true,
        });

        if (smtpPassword) {
          await context.secrets.store("emailThis.smtp.password", smtpPassword);
        }
      } else {
        //clear the existing credentials if they don't want to authenticate
        await context.secrets.delete("emailThis.smtp.username");
        await context.secrets.delete("emailThis.smtp.password");
      }
    },
  );

  context.subscriptions.push(sendThis, updateSettings);
}

// This method is called when your extension is deactivated
export function deactivate() {}
