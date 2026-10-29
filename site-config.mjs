// Public configuration for this deployment. These values are not secrets: browsers can see them, and Google
// restricts them to the origins and APIs you allow. Never put a client secret or service-account key here.
// Fill them in after setting up a Google Cloud project (see GOOGLE_SETUP.md). While they are blank, Google features
// stay off for visitors, and each browser can still enter its own project under Import → Google connection setup.
export const SITE_CONFIG={
 google:{
  clientId:'1033266073518-o5qfqtlrp4qh6llsru698o31aquqknno.apps.googleusercontent.com',      // e.g. 1234567890-abc123.apps.googleusercontent.com
  apiKey:'AIzaSyBVT0kv5b7hEbcgrt4aglsbXwmkR_ZJC5Y',        // browser API key restricted to Google Picker API and this site's origins
  projectNumber:'1033266073518'  // numeric Google Cloud project number (not the project ID)
 }
};
