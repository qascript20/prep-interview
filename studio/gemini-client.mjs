import {GoogleGenAI} from '@google/genai';

// The only credential accepted here is a short-lived, one-use token minted
// by our authenticated server. The permanent provider key stays server-side.
window.PrepStudioTransport={
  async connect(details,callbacks){
    if(!details.token?.startsWith('auth_tokens/')||!['gemini-3.8-live','gemini-3.1-flash-live-preview'].includes(details.model))throw new Error('Invalid interview connection.');
    const client=new GoogleGenAI({apiKey:details.token,httpOptions:{apiVersion:'v1beta'}});
    return client.live.connect({model:details.model,config:details.config,callbacks});
  }
};
