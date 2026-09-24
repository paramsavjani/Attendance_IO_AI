# Attendance IO — public assistant demo

The chat page behind **ai.paramsavjani.in**: the same assistant that lives inside the Attendance IO
app, open to anyone, answering from the same backend at `api.attendanceio.paramsavjani.in`.

What is different from the app is the endpoint it talks to — `/api/public/agent` instead of
`/api/agent` — and what that endpoint allows. Nobody signs in here, so the backend restricts the
demo to published institute information (clubs, committees, faculty, curriculum, timetables,
placements, campus services, alumni), strips phone numbers from every result, and caps how many
questions one visitor gets per day. None of that is asked of the model: it is enforced in
`PublicAgentToolPolicy` on the server, where a visitor cannot argue with it.

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
