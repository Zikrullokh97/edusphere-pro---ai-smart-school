import { auth, db, getAccessToken, handleFirestoreError, OperationType } from './firebase';
import { doc, setDoc } from 'firebase/firestore';

export interface WorkspaceExportItem {
  id: string;
  userId: string;
  type: 'sheet' | 'doc' | 'gmail' | 'contact';
  title: string;
  externalId?: string;
  url?: string;
  status: 'success' | 'pending' | 'failed';
  details?: string;
  createdAt: string;
}

// ----------------------------------------------------
// 1. GOOGLE SHEETS API INTEGRATION
// ----------------------------------------------------
export interface CreateSheetResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
}

export async function createGoogleSheet(
  title: string,
  headers: string[],
  rows: (string | number)[][]
): Promise<CreateSheetResult> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Google Workspace OAuth access token is required. Please sign in with Google.');
  }

  // 1. Create Spreadsheet
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title,
      },
      sheets: [
        {
          properties: {
            title: 'EduSphere Data',
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
      ],
    }),
  });

  if (!createRes.ok) {
    const errorText = await createRes.text();
    throw new Error(`Google Sheets API Error (${createRes.status}): ${errorText}`);
  }

  const sheetData = await createRes.json();
  const spreadsheetId = sheetData.spreadsheetId;
  const spreadsheetUrl = sheetData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // 2. Populate Values
  const values = [headers, ...rows];
  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/EduSphere Data!A1:Z${values.length + 5}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: `EduSphere Data!A1:Z${values.length + 5}`,
        majorDimension: 'ROWS',
        values: values,
      }),
    }
  );

  if (!updateRes.ok) {
    console.warn('Could not populate initial rows:', await updateRes.text());
  }

  // Log in Firestore if user is authenticated
  if (auth.currentUser) {
    const exportId = `sheet-${Date.now()}`;
    try {
      await setDoc(doc(db, 'workspace_exports', exportId), {
        id: exportId,
        userId: auth.currentUser.uid,
        type: 'sheet',
        title,
        externalId: spreadsheetId,
        url: spreadsheetUrl,
        status: 'success',
        details: `Exported ${rows.length} rows to Google Sheet`,
        createdAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Firestore workspace export log note:', e);
    }
  }

  return {
    spreadsheetId,
    spreadsheetUrl,
    title,
  };
}

// ----------------------------------------------------
// 2. GOOGLE DOCS API INTEGRATION
// ----------------------------------------------------
export interface CreateDocResult {
  documentId: string;
  documentUrl: string;
  title: string;
}

export async function createGoogleDoc(title: string, bodyText: string): Promise<CreateDocResult> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Google Workspace OAuth access token is required. Please sign in with Google.');
  }

  // 1. Create blank document
  const createRes = await fetch('https://docs.googleapis.com/v1/documents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title,
    }),
  });

  if (!createRes.ok) {
    const errorText = await createRes.text();
    throw new Error(`Google Docs API Error (${createRes.status}): ${errorText}`);
  }

  const docData = await createRes.json();
  const documentId = docData.documentId;
  const documentUrl = `https://docs.google.com/document/d/${documentId}/edit`;

  // 2. Insert text into body
  const updateRes = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        {
          insertText: {
            location: {
              index: 1,
            },
            text: `${title.toUpperCase()}\n=====================================\nIssued by EduSphere Central Asian Academic Management\nDate: ${new Date().toLocaleDateString()}\n\n${bodyText}\n\n=====================================\n[Confidential School Record]\n`,
          },
        },
      ],
    }),
  });

  if (!updateRes.ok) {
    console.warn('Could not insert content into doc:', await updateRes.text());
  }

  // Log in Firestore
  if (auth.currentUser) {
    const exportId = `doc-${Date.now()}`;
    try {
      await setDoc(doc(db, 'workspace_exports', exportId), {
        id: exportId,
        userId: auth.currentUser.uid,
        type: 'doc',
        title,
        externalId: documentId,
        url: documentUrl,
        status: 'success',
        details: `Generated Google Doc report (${bodyText.length} chars)`,
        createdAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Firestore doc log note:', e);
    }
  }

  return {
    documentId,
    documentUrl,
    title,
  };
}

// ----------------------------------------------------
// 3. GOOGLE CONTACTS (PEOPLE API) INTEGRATION
// ----------------------------------------------------
export interface GoogleContactItem {
  resourceName?: string;
  etag?: string;
  name: string;
  email?: string;
  phone?: string;
  relationship?: string;
  studentAffiliation?: string;
}

export async function fetchGoogleContacts(): Promise<GoogleContactItem[]> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Google Workspace OAuth access token is required. Please sign in with Google.');
  }

  const res = await fetch(
    'https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses,phoneNumbers,userDefined',
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Google Contacts (People API) Error (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  const connections = data.connections || [];

  return connections.map((person: any) => ({
    resourceName: person.resourceName,
    etag: person.etag,
    name: person.names?.[0]?.displayName || 'Unnamed Contact',
    email: person.emailAddresses?.[0]?.value || '',
    phone: person.phoneNumbers?.[0]?.value || '',
    relationship: person.userDefined?.find((u: any) => u.key === 'relationship')?.value || 'Parent / Guardian',
    studentAffiliation: person.userDefined?.find((u: any) => u.key === 'student')?.value || '',
  }));
}

export async function createGoogleContact(contact: {
  givenName: string;
  familyName: string;
  email: string;
  phone: string;
  notes?: string;
}): Promise<any> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Google Workspace OAuth access token is required. Please sign in with Google.');
  }

  const res = await fetch('https://people.googleapis.com/v1/people:createContact', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      names: [
        {
          givenName: contact.givenName,
          familyName: contact.familyName,
        },
      ],
      emailAddresses: contact.email ? [{ value: contact.email, type: 'home' }] : [],
      phoneNumbers: contact.phone ? [{ value: contact.phone, type: 'mobile' }] : [],
      biographies: contact.notes ? [{ value: contact.notes }] : [],
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to create Google Contact (${res.status}): ${errorText}`);
  }

  return await res.json();
}

// ----------------------------------------------------
// 4. GMAIL API INTEGRATION
// ----------------------------------------------------
export interface SendEmailParams {
  to: string;
  subject: string;
  messageBody: string;
  fromName?: string;
}

export async function sendGmailMessage({
  to,
  subject,
  messageBody,
  fromName = 'EduSphere Pro School Portal',
}: SendEmailParams): Promise<{ id: string; threadId: string }> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Google Workspace OAuth access token is required. Please sign in with Google.');
  }

  const userEmail = auth.currentUser?.email || 'me';

  // Build RFC 2822 email format
  const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
  const emailLines = [
    `From: "${fromName}" <${userEmail}>`,
    `To: ${to}`,
    `Subject: ${utf8Subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    messageBody,
  ];

  const rawEmail = emailLines.join('\r\n');
  const base64EncodedEmail = btoa(unescape(encodeURIComponent(rawEmail)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      raw: base64EncodedEmail,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gmail API Send Error (${res.status}): ${errorText}`);
  }

  const data = await res.json();

  // Log in Firestore
  if (auth.currentUser) {
    const exportId = `gmail-${Date.now()}`;
    try {
      await setDoc(doc(db, 'workspace_exports', exportId), {
        id: exportId,
        userId: auth.currentUser.uid,
        type: 'gmail',
        title: subject,
        externalId: data.id,
        status: 'success',
        details: `Sent email to ${to}`,
        createdAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Firestore gmail log note:', e);
    }
  }

  return data;
}

export async function fetchRecentGmailMessages(): Promise<any[]> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Google Workspace OAuth access token is required. Please sign in with Google.');
  }

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10&q=EduSphere', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    // If query with EduSphere returns nothing, fetch top 10 general
    const fallbackRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=8', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!fallbackRes.ok) return [];
    const data = await fallbackRes.json();
    return data.messages || [];
  }

  const data = await res.json();
  return data.messages || [];
}
