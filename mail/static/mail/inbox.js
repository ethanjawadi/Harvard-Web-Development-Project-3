document.addEventListener('DOMContentLoaded', function() {

  // Use buttons to toggle between views
  document.querySelector('#inbox').addEventListener('click', () => load_mailbox('inbox'));
  document.querySelector('#sent').addEventListener('click', () => load_mailbox('sent'));
  document.querySelector('#archived').addEventListener('click', () => load_mailbox('archive'));
  document.querySelector('#compose').addEventListener('click', compose_email);

  // Add event listener for form submission
  document.querySelector('#compose-form').addEventListener('submit', sendMail);

  // By default, load the inbox
  load_mailbox('inbox');
});

function compose_email() {
  // Show compose view and hide other views
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'block';

  // Clear out composition fields only if not replying
  if (!document.querySelector('#compose-form').hasAttribute('data-replying')) {
      document.querySelector('#compose-recipients').value = '';
      document.querySelector('#compose-subject').value = '';
      document.querySelector('#compose-body').value = '';
  }

  // Remove replying data attribute
  document.querySelector('#compose-form').removeAttribute('data-replying');
}

function sendMail(event) {
  // Prevent the default form submission
  event.preventDefault();

  // Get the form data
  const recipients = document.querySelector('#compose-recipients').value;
  const subject = document.querySelector('#compose-subject').value;
  const body = document.querySelector('#compose-body').value;

  // Send the email
  fetch('/emails', {
      method: 'POST',
      body: JSON.stringify({
          recipients: recipients,
          subject: subject,
          body: body
      })
  })
  .then(response => response.json())
  .then(result => {
      // Handle the result
      if (result.error) {
          console.error(result.error);
      } else {
          load_mailbox('sent');
      }
  })
  .catch(error => {
      console.error('Error:', error);
  });
}

function load_mailbox(mailbox) {
  // Show the mailbox and hide other views
  document.querySelector('#emails-view').style.display = 'block';
  document.querySelector('#compose-view').style.display = 'none';

  // Clear previous mailbox contents
  document.querySelector('#emails-view').innerHTML = '';

  // Show the mailbox name
  const emailsView = document.querySelector('#emails-view');
  emailsView.innerHTML = `<h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>`;

  // Fetch emails from the mailbox
  fetch(`/emails/${mailbox}`)
  .then(response => response.json())
  .then(emails => {
      emails.forEach(email => {
          const emailElement = document.createElement('div');
          emailElement.className = email.read ? 'email read' : 'email unread';
          emailElement.innerHTML = `
              <b>From:</b> ${email.sender}<br>
              <b>Subject:</b> ${email.subject}<br>
              <b>Timestamp:</b> ${email.timestamp}
          `;

          // Event listener to view email details
          emailElement.addEventListener('click', () => {
              viewEmail(email.id);
          });

          if (mailbox !== "sent") {
              const archiveButton = document.createElement('button');
              archiveButton.innerText = email.archived ? 'Unarchive' : 'Archive';
              archiveButton.addEventListener('click', (event) => {
                  toggleArchive(email.id, !email.archived);
                  event.stopPropagation();
              });
              emailElement.appendChild(archiveButton);
          }

          emailsView.appendChild(emailElement);
      });
  })
  .catch(error => {
      console.error('Error:', error);
  });
}

function viewEmail(emailId) {
  // Fetch the email details
  fetch(`/emails/${emailId}`)
  .then(response => response.json())
  .then(email => {
      // Display email details
      displayEmail(email);
  })
  .catch(error => {
      console.error('Error:', error);
  });
}

function displayEmail(email) {
  // Hide other views and clear previous content
  document.querySelector('#emails-view').style.display = 'block';
  document.querySelector('#compose-view').style.display = 'none';
  const emailsView = document.querySelector('#emails-view');
  emailsView.innerHTML = '';

  // Create and append elements to display email details
  const emailDetails = `
      <h3>${email.subject}</h3>
      <p><b>From:</b> ${email.sender}</p>
      <p><b>To:</b> ${email.recipients.join(", ")}</p>
      <p><b>Timestamp:</b> ${email.timestamp}</p>
      <button id="reply">Reply</button>
      <hr>
      <p>${email.body}</p>
  `;
  emailsView.innerHTML = emailDetails;

  // Add event listener to the reply button
  document.querySelector('#reply').addEventListener('click', () => {
      composeReply(email);
  });

  // Mark email as read
  markAsRead(email.id);
}

function markAsRead(emailId) {
  fetch(`/emails/${emailId}`, {
      method: 'PUT',
      body: JSON.stringify({
          read: true
      })
  });
}

function composeReply(email) {
  // Show compose view and pre-fill form
  document.querySelector('#compose-form').setAttribute('data-replying', 'true');
  compose_email(); // Calling existing function to show compose view
  document.querySelector('#compose-recipients').value = email.sender;
  document.querySelector('#compose-subject').value = email.subject.startsWith("Re:") ? email.subject : `Re: ${email.subject}`;
  document.querySelector('#compose-body').value = `\n\nOn ${email.timestamp} ${email.sender} wrote:\n${email.body}`;
}

function toggleArchive(emailId, archiveStatus) {
  fetch(`/emails/${emailId}`, {
      method: 'PUT',
      body: JSON.stringify({
          archived: archiveStatus
      })
  })
  .then(() => {
      load_mailbox('inbox'); // Reload the inbox after archiving/unarchiving
  });
}
