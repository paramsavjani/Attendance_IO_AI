# Attendance IO — public assistant demo

The chat page behind **ai.paramsavjani.in**: the same assistant that lives inside the Attendance IO
app, open to anyone, answering from the same backend at `api.attendanceio.paramsavjani.in`.

What is different from the app is the endpoint it talks to — `/api/public/agent` instead of
`/api/agent` — and what that endpoint allows. Nobody signs in here, so the backend restricts the
demo to published institute information (clubs, committees, faculty, curriculum, timetables,
placements, campus services, alumni), strips phone numbers from every result, and caps how many
questions one visitor gets per day. None of that is asked of the model: it is enforced in
`PublicAgentToolPolicy` on the server, where a visitor cannot argue with it.

## Who can ask

Three questions with no account at all, then the page asks for a Google account and allows fifteen a
day. The free questions exist because a page you have to sign into before seeing anything work is a
page most people close; the wall exists because every answer costs real money and a link on LinkedIn
reaches scripts as well as people. A day's ceiling across everyone caps the bill whatever happens.

Sign-in is Google Identity Services: the browser gets a signed ID token, sends it as a bearer
credential, and the backend verifies its signature, expiry, issuer and audience before it counts for
anything. No redirect, no cookie, nothing shared with the app's own login on another domain.

It needs a Google OAuth **client id**, set on the server as `AGENT_PUBLIC_GOOGLE_CLIENT_ID` — the page
reads it from `/info`, so it is configured in one place. Whichever client id is used, this site's
origin has to be listed under *Authorized JavaScript origins* in the Google Cloud console. Leave the
variable unset and the page simply stays anonymous-only.

## Running it

```bash
npm install
npm run dev     # http://localhost:5273, API proxied to production (see vite.config.ts)
npm run build
```

`VITE_API_BASE_URL` points at the backend. It is empty in development on purpose — requests go
through Vite's proxy so the browser stays same-origin — and set to the production API in
`.env.production`.

## Deploying

Vercel, same as the other sites: import this repository, framework **Vite**, and add the domain
`ai.paramsavjani.in`. The build needs nothing but `VITE_API_BASE_URL`, which `.env.production`
already carries.

The backend allows this origin through `AGENT_PUBLIC_ORIGINS`; a different domain needs that
variable changed on the server too.
