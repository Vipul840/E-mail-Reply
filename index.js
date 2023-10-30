
const express = require('express');
const app = express();
const port = 8000;
const path = require('path');
const fs=require('fs').promises;
const { authenticate } = require('@google-cloud/local-auth');
const { google } = require('googleapis');
const { error } = require('console');

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.labels',
  'https://mail.google.com/'
]; //<- #11-16 const SCOPES =

app.get('/', async (req, res) => {
  // Load client secrets from a local file.
  const credentials = await fs.readFile('credentials.json');
  // Authorize a client with credentials, then call the Gmail API.
  const auth = await authenticate({
    keyfilePath: path.join(__dirname, 'credentials.json'),
    scopes: SCOPES,
  });

  console.log("THis is AUTH = ", auth);
  const gmail = google.gmail({ version: 'v1', auth });
  const response = await gmail.users.labels.list({
    userId: 'me',
  }
  ); //<- #38-42 const response = await gmail.users.labels.list

  const LABEL_NAME = 'Vacation';
  // Load credentials from file
  async function loadCredentials() {
    const filePath = path.join(process.cwd(), 'credentials.json');
    const content = await fs.readFile(filePath, { encoding: 'utf8' });
    return JSON.parse(content);
  } //<- #48-52 async function loadCredentials()


  // Get messages that have no prior replies
  async function getUnrepliedMessages(auth) {
    const gmail = google.gmail({ version: 'v1', auth });
    const res = await gmail.users.messages.list({
      userId: 'me',
      q: '-in:chats -from:me -has:userlabels',
    });
    return res.data.messages || [];
  } //<- # 56-63 async function getUnrepliedMessages (auth)


  // Send reply to a message
  async function sendReply(auth, message) {
    const gmail = google.gmail({ version: 'v1', auth });
    const res = await gmail.users.messages.get({
      userId: 'me',
      id: message.id,
      format: 'metadata',
      metadataHeaders: ['Subject', 'From'],
    }); //<- #68-73 const res await gmail.users.messages.get
    const subject = res.data.payload.headers.find(
      (header) => header.name === 'Subject'
    ).value;
    const from = res.data.payload.headers.find(
      (header) => header.name === 'From'
    ).value;

    const replyTo = from.match(/<(.*)>/)[1];
    const replySubject = subject.startsWith('Re:') ? subject : `Re : ${subject}`;
    const replyBody = `Hi ,\n\n I am currrnty on vacation and contact to you later.Thankyou \n\n Best, \nYour Name`;
    const rawMessage = [
      `From : me`,
        `To: ${replyTo}`,
      `Subject: ${replySubject}`,
      `In-Reply-To: ${message.id}`,
      `References: ${message.id}`,
      '',
      replyBody,
    ].join('\n');
    const encodeMessage = Buffer.from(rawMessage).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodeMessage,
      },
    });

  }
   
  async function createLabel(auth) {
    console.log("hello");
    const gmail = google.gmail({ version: 'v1', auth });
    try {
      const res = await gmail.users.labels.create({
        userId: 'me',
        requestBody: {
          name: LABEL_NAME,
          labelListVisibility: 'labelshow', // Change this value
          messageListVisibility: 'show', // Change this value.
        }, //<- #145-149 request Body:
      }); //# 143-150 const res await gmail.users.labels.create
      return res.data.id;
    } catch (err) {
      if (err.code === 409) {
        //Label already exists
        const res = await gmail.users.labels.list({
          userId: 'me',
        });
        const label = res.data.labels.find((label) => label.name === LABEL_NAME);
        return label.id;
      } else {
        throw err;
      }
    }
  }


  // Add label to a message and move it to the label folder
  async function addLabel(auth, message, labelId) {
    const gmail = google.gmail({ version: 'v1', auth });
    await gmail.users.messages.modify({
      userId: 'me',
      id: message.id,
      requestBody: {
        addLabelIds: [labelId],
        removeLabelIds: ['INBOX'],
      },
    }); //< - #173 - 180 await gmail.users.messages.modify
  } //< - #171 - 181 async function addLabel(auth, message, labelid)


  // Main function
  async function main() {
    // Create a label for the app
    const labelId = await createLabel(auth);
    console.log(`Created or found label with id ${labelId}`);
    // Repeat the following steps in random intervals
    setInterval(async () => {
      // Get messages that have no prior replies
      const messages = await getUnrepliedMessages(auth);
      console.log(`Found ${messages.length} unreplied messages`);
      // For each message
      for (const message of messages) {
        // Send reply to the message
        await sendReply(auth, message);
        console.log(`Sent reply to message with id ${message.id}`);

        // Add label to the message and move it to the label folder
        await addLabel(auth, message, labelId);
        console.log(`Added label to message with id ${message.id}`);
      } //<- #200-208 for (const message of messages)
    }, Math.floor(Math.random() * (120 - 45 + 1) + 45) * 1000); // Random interval between 45 and 120 seconds
  }//<- #186-210 async function main()
  main().catch(console.error);
const labels = response.data.labels;
  res.send("You have successfully subscribed to our service.");
}); //<- #20-220 app.get


app.listen(3000, () => {
  console.log(`Example app listening at http://localhost:${3000}`);
});
