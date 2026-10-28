// Public configuration for this deployment. These values are not secrets: browsers can see them, and Google
// restricts them to the origins and APIs you allow. Never put a client secret or service-account key here.
// Fill them in after setting up a Google Cloud project (see GOOGLE_SETUP.md). While they are blank, Google features
// stay off for visitors, and each browser can still enter its own project under Import → Google connection setup.
export const SITE_CONFIG={
 google:{
  clientId:'',      // e.g. 1234567890-abc123.apps.googleusercontent.com
  apiKey:'',        // browser API key restricted to Google Picker API and this site's origins
  projectNumber:''  // numeric Google Cloud project number (not the project ID)
 }
};
